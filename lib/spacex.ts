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

export type Rocket = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  first_flight: string;
};

export async function getLaunches(): Promise<Launch[]> {
  const res = await fetch(`${API_BASE}/launches`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch launches');
  }

  return res.json();
}

export async function getRockets(): Promise<Rocket[]> {
  const res = await fetch(`${API_BASE}/rockets`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch rockets');
  }

  return res.json();
}

export async function getLaunchById(id: string): Promise<Launch> {
  const res = await fetch(`${API_BASE}/launches/${id}`, {
    next: { revalidate: 3600 }
  });

  if (!res.ok) {
    throw new Error('Failed to fetch launch');
  }

  return res.json();
}

export function formatLaunchDate(dateUtc: string) {
  return new Date(dateUtc).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
}
