import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const OUTPUT_LAUNCHES = path.join(projectRoot, 'data', 'supplemental-launches.json');
const OUTPUT_ROCKETS = path.join(projectRoot, 'data', 'supplemental-rockets.json');
const OUTPUT_META = path.join(projectRoot, 'data', 'supplemental-meta.json');

const SPACEX_API_BASE = 'https://api.spacexdata.com/v4';
const LL2_API_BASE = 'https://ll.thespacedevs.com/2.2.0/launch/';
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php';

const BASE_CUTOFF_UTC = process.env.BASE_CUTOFF_UTC ?? '2022-12-04T23:59:59Z';
const REQUEST_TIMEOUT_MS = 15000;

const SOURCE_CATALOG = [
  {
    name: 'SpaceX API v4',
    url: 'https://api.spacexdata.com/v4/'
  },
  {
    name: 'The Space Devs Launch Library 2',
    url: 'https://ll.thespacedevs.com/2.2.0/'
  },
  {
    name: 'Wikipedia API',
    url: 'https://www.mediawiki.org/wiki/API:Main_page'
  }
];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpaceX-Launch-Archive-Sync/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status}): ${url}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function successFromStatus(status) {
  const value = `${status?.name ?? ''} ${status?.abbrev ?? ''}`.toLowerCase();

  if (value.includes('success')) return true;
  if (value.includes('partial failure')) return false;
  if (value.includes('failure')) return false;
  return null;
}

function isUpcoming(status, dateUtc) {
  const now = Date.now();
  const launchTime = Date.parse(dateUtc);
  if (!Number.isNaN(launchTime) && launchTime > now) return true;

  const value = `${status?.name ?? ''} ${status?.abbrev ?? ''}`.toLowerCase();
  if (value.includes('go') || value.includes('hold') || value.includes('tbd') || value.includes('to be determined')) {
    return true;
  }

  return false;
}

function pickWebcast(launch) {
  if (Array.isArray(launch.vidURLs) && launch.vidURLs.length > 0) {
    const direct = launch.vidURLs.find((item) => typeof item?.url === 'string');
    if (direct?.url) return direct.url;
  }

  return null;
}

function isLl2ApiUrl(url) {
  return typeof url === 'string' && /^https?:\/\/ll\.thespacedevs\.com\/2\.2\.0\//i.test(url);
}

function pickArticle(launch) {
  if (Array.isArray(launch.infoURLs) && launch.infoURLs.length > 0) {
    const info = launch.infoURLs.find((item) => typeof item?.url === 'string' && !isLl2ApiUrl(item.url));
    if (info?.url) return info.url;
  }

  if (typeof launch.url === 'string' && !isLl2ApiUrl(launch.url)) {
    return launch.url;
  }

  return null;
}

function normalizeRocket(launch, knownRocketIdsByName) {
  const config = launch.rocket?.configuration;
  const rocketName =
    config?.full_name ??
    config?.name ??
    launch.rocket?.launcher_stage?.launcher?.name ??
    'Unknown Rocket';

  const knownId = knownRocketIdsByName.get(rocketName.toLowerCase());
  if (knownId) {
    return {
      rocketId: knownId,
      supplementalRocket: null
    };
  }

  const id = `supplemental-rocket-${slugify(rocketName)}`;

  return {
    rocketId: id,
    supplementalRocket: {
      id,
      name: rocketName,
      type: config?.family ?? 'Unknown',
      active: true,
      first_flight: config?.maiden_flight ?? 'Unknown'
    }
  };
}

function normalizeLaunch(launch, knownRocketIdsByName, cutoffUtc) {
  const dateUtc = launch.net ?? launch.window_start ?? launch.window_end;
  if (!dateUtc) return null;

  const launchDate = Date.parse(dateUtc);
  if (Number.isNaN(launchDate)) return null;
  if (launchDate <= cutoffUtc) return null;

  const providerName = launch.launch_service_provider?.name ?? '';
  if (!providerName.toLowerCase().includes('spacex')) return null;

  const { rocketId, supplementalRocket } = normalizeRocket(launch, knownRocketIdsByName);

  return {
    launch: {
      id: `supplemental-ll2-${launch.id}`,
      name: launch.name ?? `SpaceX Launch ${launch.id}`,
      date_utc: new Date(launchDate).toISOString(),
      success: successFromStatus(launch.status),
      upcoming: isUpcoming(launch.status, dateUtc),
      rocket: rocketId,
      details: launch.mission?.description ?? null,
      links: {
        patch: {
          small: launch.image ?? null,
          large: launch.image ?? launch.infographic ?? null
        },
        flickr: {
          small: [],
          original: []
        },
        webcast: pickWebcast(launch),
        wikipedia: null,
        article: pickArticle(launch)
      }
    },
    supplementalRocket
  };
}

async function fetchSpaceXRocketsMap() {
  const rockets = await fetchJson(`${SPACEX_API_BASE}/rockets`);
  const map = new Map();

  for (const rocket of rockets) {
    if (!rocket?.name || !rocket?.id) continue;
    map.set(String(rocket.name).toLowerCase(), String(rocket.id));
  }

  return map;
}

async function fetchLL2Launches(startAfterUtc) {
  const launches = [];
  const first = new URL(LL2_API_BASE);
  first.searchParams.set('limit', '100');
  first.searchParams.set('mode', 'detailed');
  first.searchParams.set('search', 'SpaceX');
  first.searchParams.set('window_start__gte', new Date(startAfterUtc).toISOString());

  let pageUrl = first.toString();

  while (pageUrl) {
    const page = await fetchJson(pageUrl);
    if (!Array.isArray(page.results)) break;

    launches.push(...page.results);
    pageUrl = page.next;
  }

  return launches;
}

function dedupeLaunches(launches) {
  const byId = new Map();
  const byFingerprint = new Set();

  for (const launch of launches) {
    if (byId.has(launch.id)) continue;

    const fingerprint = `${slugify(launch.name)}|${launch.date_utc.slice(0, 19)}`;
    if (byFingerprint.has(fingerprint)) continue;

    byId.set(launch.id, launch);
    byFingerprint.add(fingerprint);
  }

  return Array.from(byId.values()).sort(
    (a, b) => Date.parse(a.date_utc) - Date.parse(b.date_utc)
  );
}

async function findWikipediaUrl(title) {
  const url = new URL(WIKIPEDIA_API);
  url.searchParams.set('action', 'opensearch');
  url.searchParams.set('search', `${title} SpaceX`);
  url.searchParams.set('limit', '1');
  url.searchParams.set('namespace', '0');
  url.searchParams.set('format', 'json');

  try {
    const result = await fetchJson(url.toString());
    if (!Array.isArray(result) || !Array.isArray(result[3])) return null;
    return typeof result[3][0] === 'string' ? result[3][0] : null;
  } catch {
    return null;
  }
}

async function enrichWikipediaLinks(launches) {
  const CONCURRENCY = 5;
  let index = 0;

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= launches.length) return;

      const launch = launches[current];
      if (launch.links.wikipedia) continue;

      const url = await findWikipediaUrl(launch.name);
      if (url) {
        launch.links.wikipedia = url;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function main() {
  const cutoffUtc = Date.parse(BASE_CUTOFF_UTC);
  if (Number.isNaN(cutoffUtc)) {
    throw new Error(`Invalid BASE_CUTOFF_UTC: ${BASE_CUTOFF_UTC}`);
  }

  const knownRocketIdsByName = await fetchSpaceXRocketsMap();
  const ll2Launches = await fetchLL2Launches(cutoffUtc + 1000);

  const supplementalRocketsById = new Map();
  const normalizedLaunches = [];

  for (const rawLaunch of ll2Launches) {
    const normalized = normalizeLaunch(rawLaunch, knownRocketIdsByName, cutoffUtc);
    if (!normalized) continue;

    normalizedLaunches.push(normalized.launch);

    if (normalized.supplementalRocket) {
      supplementalRocketsById.set(normalized.supplementalRocket.id, normalized.supplementalRocket);
    }
  }

  const dedupedLaunches = dedupeLaunches(normalizedLaunches);
  await enrichWikipediaLinks(dedupedLaunches);

  const supplementalRockets = Array.from(supplementalRocketsById.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const meta = {
    generated_at_utc: new Date().toISOString(),
    base_cutoff_utc: new Date(cutoffUtc).toISOString(),
    sources: SOURCE_CATALOG,
    stats: {
      supplemental_launches: dedupedLaunches.length,
      supplemental_rockets: supplementalRockets.length
    }
  };

  await writeJson(OUTPUT_LAUNCHES, dedupedLaunches);
  await writeJson(OUTPUT_ROCKETS, supplementalRockets);
  await writeJson(OUTPUT_META, meta);

  console.log(`Wrote ${dedupedLaunches.length} launches -> ${path.relative(projectRoot, OUTPUT_LAUNCHES)}`);
  console.log(`Wrote ${supplementalRockets.length} rockets -> ${path.relative(projectRoot, OUTPUT_ROCKETS)}`);
  console.log(`Wrote metadata -> ${path.relative(projectRoot, OUTPUT_META)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
