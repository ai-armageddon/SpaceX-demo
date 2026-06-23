import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const REQUEST_TIMEOUT_MS = Number.parseInt(process.env.REQUEST_TIMEOUT_MS ?? '30000', 10);
const REQUEST_RETRIES = Number.parseInt(process.env.REQUEST_RETRIES ?? '4', 10);
const REQUEST_RETRY_BACKOFF_MS = Number.parseInt(process.env.REQUEST_RETRY_BACKOFF_MS ?? '5000', 10);
const LL2_PAGE_DELAY_MS = Number.parseInt(process.env.LL2_PAGE_DELAY_MS ?? '2500', 10);
const ENABLE_WIKIPEDIA_ENRICH = process.env.ENABLE_WIKIPEDIA_ENRICH === 'true';
const MIN_LAUNCHES_TO_REPLACE = Number.parseInt(process.env.MIN_LAUNCHES_TO_REPLACE ?? '200', 10);

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response) {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) return null;
  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }
  return null;
}

async function fetchJson(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
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
        if (response.status === 429 && attempt < REQUEST_RETRIES) {
          const retryAfterMs = parseRetryAfterMs(response) ?? REQUEST_RETRY_BACKOFF_MS * attempt;
          console.warn(`[retry ${attempt}/${REQUEST_RETRIES}] 429 for ${url}. Waiting ${Math.round(retryAfterMs / 1000)}s before retry...`);
          await sleep(retryAfterMs);
          continue;
        }

        throw new Error(`Request failed (${response.status}): ${url}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);

      if (attempt < REQUEST_RETRIES) {
        console.warn(`[retry ${attempt}/${REQUEST_RETRIES}] ${url} failed: ${message}. Retrying in ${REQUEST_RETRY_BACKOFF_MS * attempt}ms...`);
        await sleep(REQUEST_RETRY_BACKOFF_MS * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
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
  const map = new Map();

  try {
    const rockets = await fetchJson(`${SPACEX_API_BASE}/rockets`);
    for (const rocket of rockets) {
      if (!rocket?.name || !rocket?.id) continue;
      map.set(String(rocket.name).toLowerCase(), String(rocket.id));
    }
  } catch (error) {
    console.warn(
      `[warn] SpaceX rockets API unavailable (${error instanceof Error ? error.message : error}); falling back to supplemental rocket IDs`
    );
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

    if (pageUrl && LL2_PAGE_DELAY_MS > 0) {
      await sleep(LL2_PAGE_DELAY_MS);
    }
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

async function readJson(filePath, fallback = []) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
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

  const previousLaunches = await readJson(OUTPUT_LAUNCHES, []);
  const previousRockets = await readJson(OUTPUT_ROCKETS, []);

  const knownRocketIdsByName = await fetchSpaceXRocketsMap();
  const ll2Launches = await fetchLL2Launches(cutoffUtc + 1000);

  const supplementalRocketsById = new Map(
    Array.isArray(previousRockets)
      ? previousRockets.map((rocket) => [rocket.id, rocket])
      : []
  );
  const normalizedLaunches = [];

  for (const rawLaunch of ll2Launches) {
    const normalized = normalizeLaunch(rawLaunch, knownRocketIdsByName, cutoffUtc);
    if (!normalized) continue;

    normalizedLaunches.push(normalized.launch);

    if (normalized.supplementalRocket) {
      supplementalRocketsById.set(normalized.supplementalRocket.id, normalized.supplementalRocket);
    }
  }

  let dedupedLaunches = dedupeLaunches(normalizedLaunches);

  const previousCount = Array.isArray(previousLaunches) ? previousLaunches.length : 0;
  if (dedupedLaunches.length < MIN_LAUNCHES_TO_REPLACE && previousCount > dedupedLaunches.length) {
    console.warn(
      `[warn] refusing to replace supplemental launches with small dataset (${dedupedLaunches.length} < ${MIN_LAUNCHES_TO_REPLACE}); keeping previous (${previousCount})`
    );
    dedupedLaunches = previousLaunches;
  }

  if (ENABLE_WIKIPEDIA_ENRICH && dedupedLaunches.length > 0) {
    await enrichWikipediaLinks(dedupedLaunches);
  }

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
