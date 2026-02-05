import LaunchBrowser from '@/components/LaunchBrowser';
import { getLaunches, getRockets } from '@/lib/spacex';

export default async function HomePage() {
  const [launches, rockets] = await Promise.all([getLaunches(), getRockets()]);

  return (
    <main className="min-h-screen pb-12">
      <section className="mx-auto max-w-6xl px-6 pt-10">
        <div className="rounded-3xl border border-slate/70 bg-gradient-to-br from-slate/70 via-midnight/80 to-night/90 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.4em] text-haze">Mission Control</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">SpaceX Launch Intelligence</h2>
          <p className="mt-4 max-w-2xl text-base text-haze">
            Browse every SpaceX mission with up-to-date details, rocket data, and mission patches.
            Use the live search and sorting tools to explore launches in seconds.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs text-haze">
            <span className="rounded-full border border-slate/70 bg-night/60 px-3 py-1">Launches: {launches.length}</span>
            <span className="rounded-full border border-slate/70 bg-night/60 px-3 py-1">Rockets: {rockets.length}</span>
            <span className="rounded-full border border-slate/70 bg-night/60 px-3 py-1">
              Data source: SpaceX API v4
            </span>
          </div>
        </div>
      </section>
      <LaunchBrowser launches={launches} rockets={rockets} />
    </main>
  );
}
