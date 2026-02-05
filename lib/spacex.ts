const API_BASE = 'https://api.spacexdata.com/v4';

export type Launch = {
  id: string;
  name: string;
  date_utc: string;
  success: boolean | null;
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
