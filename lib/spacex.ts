import supplementalLaunchesData from '@/data/supplemental-launches.json';
import supplementalRocketsData from '@/data/supplemental-rockets.json';

const API_BASE = 'https://api.spacexdata.com/v4';

export type Launch = {
  id: string;
  name: string;
  date_utc: string;
  success: boolean | null;
  upcoming: boolean;
  rocket: string;
  details: string | null;
  links: {
    patch: {
      small: string | null;
      large: string | null;
    };
    flickr: {
      small: string[];
      original: string[];
    };
    webcast: string | null;
    wikipedia: string | null;
    article: string | null;
  };
};

export const LAUNCH_COUNT_CUTOFF_UTC = new Date('2022-12-04T23:59:59Z');
export const EXCLUDED_LAUNCH_IDS = new Set(['5eb87ad9ffd86e000604b360']);

export type Rocket = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  first_flight: string;
};

const supplementalLaunches = supplementalLaunchesData as Launch[];
const supplementalRockets = supplementalRocketsData as Rocket[];

export function stripExcludedLaunches(launches: Launch[]) {
  return launches.filter((launch) => !EXCLUDED_LAUNCH_IDS.has(launch.id));
}

export function includeInOfficialCount(
  launch: Launch,
  cutoff: Date | number = LAUNCH_COUNT_CUTOFF_UTC
) {
  if (EXCLUDED_LAUNCH_IDS.has(launch.id)) return false;
  if (launch.upcoming) return false;
  const dateValue = Date.parse(launch.date_utc);
  if (Number.isNaN(dateValue)) return false;
  const cutoffValue = typeof cutoff === 'number' ? cutoff : cutoff.getTime();
  if (dateValue > cutoffValue) return false;
  return true;
}

function buildLaunchFingerprint(launch: Launch) {
  const time = Date.parse(launch.date_utc);
  const normalizedTime = Number.isNaN(time) ? launch.date_utc : new Date(time).toISOString().slice(0, 19);
  return `${slugifyLaunchName(launch.name)}|${normalizedTime}`;
}

function mergeLaunches(primary: Launch[], secondary: Launch[]) {
  const merged = new Map<string, Launch>();
  const seenFingerprint = new Set<string>();

  for (const launch of [...primary, ...secondary]) {
    if (merged.has(launch.id)) continue;

    const fingerprint = buildLaunchFingerprint(launch);
    if (seenFingerprint.has(fingerprint)) continue;

    merged.set(launch.id, launch);
    seenFingerprint.add(fingerprint);
  }

  return Array.from(merged.values()).sort(
    (a, b) => Date.parse(b.date_utc) - Date.parse(a.date_utc)
  );
}

function mergeRockets(primary: Rocket[], secondary: Rocket[]) {
  const merged = new Map<string, Rocket>();

  for (const rocket of [...primary, ...secondary]) {
    if (merged.has(rocket.id)) continue;
    merged.set(rocket.id, rocket);
  }

  return Array.from(merged.values());
}

export async function getLaunches(): Promise<Launch[]> {
  const res = await fetch(`${API_BASE}/launches`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch launches');
  }

  const baseLaunches = (await res.json()) as Launch[];
  const visibleBaseLaunches = stripExcludedLaunches(baseLaunches);

  return mergeLaunches(visibleBaseLaunches, supplementalLaunches);
}

export async function getRockets(): Promise<Rocket[]> {
  const res = await fetch(`${API_BASE}/rockets`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch rockets');
  }

  const baseRockets = (await res.json()) as Rocket[];
  return mergeRockets(baseRockets, supplementalRockets);
}

export async function getLaunchById(id: string): Promise<Launch> {
  const fromSupplemental = supplementalLaunches.find((launch) => launch.id === id);
  if (fromSupplemental) {
    return fromSupplemental;
  }

  const res = await fetch(`${API_BASE}/launches/${id}`, {
    next: { revalidate: 3600 }
  });

  if (res.ok) {
    return res.json();
  }

  const fromMergedList = (await getLaunches()).find((launch) => launch.id === id);
  if (fromMergedList) {
    return fromMergedList;
  }

  throw new Error('Failed to fetch launch');
}

export function formatLaunchDate(dateUtc: string) {
  return new Date(dateUtc).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
}

export function slugifyLaunchName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function buildLaunchSlug(launch: Launch) {
  return `${slugifyLaunchName(launch.name)}--${launch.id}`;
}

export function extractLaunchId(slugOrId: string) {
  const separator = '--';
  const separatorIndex = slugOrId.lastIndexOf(separator);
  if (separatorIndex !== -1) {
    return slugOrId.slice(separatorIndex + separator.length);
  }

  const supplementalToken = 'supplemental-ll2-';
  const supplementalIndex = slugOrId.indexOf(supplementalToken);
  if (supplementalIndex !== -1) {
    return slugOrId.slice(supplementalIndex);
  }

  if (slugOrId.includes('-')) {
    const parts = slugOrId.split('-');
    return parts[parts.length - 1];
  }

  return slugOrId;
}
