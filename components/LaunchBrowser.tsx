'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Launch, Rocket } from '@/lib/spacex';
import { buildLaunchSlug, formatLaunchDate } from '@/lib/spacex';

const sortOptions = [
  { value: 'date-desc', label: 'Date: Newest' },
  { value: 'date-asc', label: 'Date: Oldest' },
  { value: 'success', label: 'Success First' },
  { value: 'failure', label: 'Failure First' }
] as const;

const hideFilterOptions = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'failure', label: 'Failed' },
  { key: 'success', label: 'Successful' },
  { key: 'pending', label: 'Pending' }
] as const;

const viewOptions = [
  { value: 'grid', label: 'Grid' },
  { value: 'list', label: 'List' }
] as const;

export default function LaunchBrowser({
  launches,
  rockets
}: {
  launches: Launch[];
  rockets: Rocket[];
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<(typeof sortOptions)[number]['value']>('date-desc');
  const [hideFilters, setHideFilters] = useState<Record<(typeof hideFilterOptions)[number]['key'], boolean>>({
    upcoming: false,
    failure: false,
    success: false,
    pending: false
  });
  const [year, setYear] = useState<string>('all');
  const [view, setView] = useState<(typeof viewOptions)[number]['value']>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(18);

  const rocketMap = useMemo(() => {
    return new Map(rockets.map((rocket) => [rocket.id, rocket]));
  }, [rockets]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const base = normalized
      ? launches.filter((launch) => launch.name.toLowerCase().includes(normalized))
      : launches.slice();

    const filteredByStatus = base.filter((launch) => {
      if (launch.upcoming && hideFilters.upcoming) return false;
      if (launch.success === true && hideFilters.success) return false;
      if (launch.success === false && hideFilters.failure) return false;
      if (launch.success === null && !launch.upcoming && hideFilters.pending) return false;
      return true;
    });

    const filteredByYear =
      year === 'all'
        ? filteredByStatus
        : filteredByStatus.filter(
            (launch) => new Date(launch.date_utc).getFullYear().toString() === year
          );

    filteredByYear.sort((a, b) => {
      if (sort === 'date-desc') {
        return new Date(b.date_utc).getTime() - new Date(a.date_utc).getTime();
      }
      if (sort === 'date-asc') {
        return new Date(a.date_utc).getTime() - new Date(b.date_utc).getTime();
      }
      if (sort === 'success') {
        return Number(b.success) - Number(a.success);
      }
      if (sort === 'failure') {
        return Number(a.success) - Number(b.success);
      }
      return 0;
    });

    return filteredByYear;
  }, [launches, query, sort, hideFilters, year]);

  const years = useMemo(() => {
    const set = new Set<string>();
    launches.forEach((launch) => {
      set.add(new Date(launch.date_utc).getFullYear().toString());
    });
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [launches]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    sort,
    year,
    pageSize,
    hideFilters.upcoming,
    hideFilters.failure,
    hideFilters.success,
    hideFilters.pending
  ]);

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid gap-4 rounded-2xl border border-slate/70 bg-steel/70 p-6 shadow-glow sm:grid-cols-2 xl:grid-cols-12">
        <div className="sm:col-span-2 xl:col-span-3">
          <p className="text-sm text-haze">Search missions</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a mission name"
            className="mt-2 min-h-[52px] w-full rounded-xl border border-slate/60 bg-night/70 px-4 py-3 text-sm text-white outline-none transition focus:border-neon/70 focus:ring-2 focus:ring-neon/30"
          />
        </div>
        <div className="xl:col-span-2">
          <p className="text-sm text-haze">Sort launches</p>
          <div className="mt-2 inline-flex w-full items-center rounded-xl border border-slate/60 bg-night/70 px-3">
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as typeof sort)}
              className="min-h-[52px] w-full bg-transparent py-3 text-sm text-white outline-none"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-night">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="sm:col-span-2 xl:col-span-3">
          <p className="text-sm text-haze">Hide filters</p>
          <div className="mt-2 grid min-h-[52px] grid-cols-2 gap-2 rounded-xl border border-slate/60 bg-night/70 p-2 sm:grid-cols-4 xl:grid-cols-2">
            {hideFilterOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() =>
                  setHideFilters((prev) => ({
                    ...prev,
                    [option.key]: !prev[option.key]
                  }))
                }
                className={`h-9 whitespace-nowrap rounded-lg px-2 text-[11px] font-semibold uppercase tracking-wider transition sm:text-xs ${
                  hideFilters[option.key]
                    ? 'bg-rose-500/20 text-rose-200'
                    : 'text-haze hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="xl:col-span-2">
          <p className="text-sm text-haze">Filter year</p>
          <div className="mt-2 inline-flex w-full items-center rounded-xl border border-slate/60 bg-night/70 px-3">
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="min-h-[52px] w-full bg-transparent py-3 text-sm text-white outline-none"
            >
              <option value="all" className="bg-night">
                All Years
              </option>
              {years.map((item) => (
                <option key={item} value={item} className="bg-night">
                  {item}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="xl:col-span-1">
          <p className="text-sm text-haze">View</p>
          <div className="mt-2 inline-flex min-h-[52px] w-full items-center gap-2 rounded-xl border border-slate/60 bg-night/70 p-1">
            {viewOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setView(option.value)}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                  view === option.value
                    ? 'bg-neon/20 text-neon'
                    : 'text-haze hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="xl:col-span-1">
          <p className="text-sm text-haze">Page size</p>
          <div className="mt-2 inline-flex w-full items-center rounded-xl border border-slate/60 bg-night/70 px-3">
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="min-h-[52px] w-full bg-transparent py-3 text-sm text-white outline-none"
            >
              {[12, 18, 24, 36].map((size) => (
                <option key={size} value={size} className="bg-night">
                  {size} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div
        className={
          view === 'grid'
            ? 'mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
            : 'mt-8 flex flex-col gap-4'
        }
      >
        {paginated.map((launch) => {
          const rocket = rocketMap.get(launch.rocket);
          const image = launch.links.patch.small ?? launch.links.patch.large;
          return (
            <Link
              key={launch.id}
              href={`/launch/${buildLaunchSlug(launch)}`}
              className={`group flex h-full gap-6 rounded-2xl border border-slate/70 bg-midnight/80 p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-neon/60 hover:shadow-glow active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon/50 ${
                view === 'grid' ? 'flex-col' : 'flex-col sm:flex-row sm:items-center'
              }`}
            >
              <div className="flex flex-1 items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-haze">Mission</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{launch.name}</h2>
                  {view === 'list' && (
                    <p className="mt-2 text-sm text-haze">
                      {rocket ? `${rocket.name} · ${rocket.type}` : 'Unknown Rocket'}
                    </p>
                  )}
                </div>
                <div
                  className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wider ${
                    launch.success === null
                      ? 'bg-slate/60 text-haze'
                      : launch.success
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-rose-500/20 text-rose-200'
                  }`}
                >
                  {launch.success === null ? 'Pending' : launch.success ? 'Success' : 'Failure'}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-slate/60 bg-night/70">
                  {image ? (
                    <Image src={image} alt={`${launch.name} patch`} fill className="object-contain p-2" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-haze">No Patch</div>
                  )}
                </div>
                <div className="text-sm text-haze">
                  <p className="font-medium text-white">{formatLaunchDate(launch.date_utc)}</p>
                  {view === 'grid' && (
                    <p>{rocket ? `${rocket.name} · ${rocket.type}` : 'Unknown Rocket'}</p>
                  )}
                </div>
              </div>

              <div className="mt-auto text-sm text-neon/90">View details →</div>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-10 rounded-2xl border border-slate/70 bg-midnight/70 p-8 text-center text-haze">
          No launches match that search yet.
        </div>
      )}

      {filtered.length > 0 && (
        <div className="mt-10 flex flex-col items-center justify-between gap-4 text-sm text-haze sm:flex-row">
          <div>
            Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of{' '}
            {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="rounded-full border border-slate/70 bg-night/70 px-4 py-2 text-haze transition hover:border-neon/60 hover:text-neon disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className="px-2 text-xs uppercase tracking-[0.3em] text-haze">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="rounded-full border border-slate/70 bg-night/70 px-4 py-2 text-haze transition hover:border-neon/60 hover:text-neon disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
