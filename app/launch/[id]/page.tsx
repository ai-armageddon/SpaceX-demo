import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatLaunchDate, getLaunchById, getRockets } from '@/lib/spacex';

export default async function LaunchDetailPage({
  params
}: {
  params: { id: string };
}) {
  try {
    const [launch, rockets] = await Promise.all([
      getLaunchById(params.id),
      getRockets()
    ]);

    const rocket = rockets.find((item) => item.id === launch.rocket);
    const image = launch.links.patch.large ?? launch.links.patch.small;
    const flickrImages = launch.links.flickr?.original?.length
      ? launch.links.flickr.original
      : launch.links.flickr?.small ?? [];

    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/" className="text-sm text-haze hover:text-neon">
          ← Back to launches
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-slate/70 bg-midnight/80 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-haze">Mission</p>
                <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{launch.name}</h1>
                <p className="mt-3 text-haze">{formatLaunchDate(launch.date_utc)}</p>
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

            <p className="mt-6 text-base text-haze">
              {launch.details ?? 'No mission details have been published yet.'}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate/70 bg-night/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-haze">Rocket</p>
                <p className="mt-2 text-lg text-white">{rocket?.name ?? 'Unknown Rocket'}</p>
                <p className="text-sm text-haze">{rocket?.type ?? 'Unknown type'}</p>
              </div>
              <div className="rounded-2xl border border-slate/70 bg-night/70 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-haze">First Flight</p>
                <p className="mt-2 text-lg text-white">{rocket?.first_flight ?? 'Unknown'}</p>
                <p className="text-sm text-haze">{rocket?.active ? 'Active vehicle' : 'Retired vehicle'}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {launch.links.webcast && (
                <a
                  href={launch.links.webcast}
                  className="rounded-full border border-slate/70 bg-night/70 px-4 py-2 text-haze transition hover:border-neon/60 hover:text-neon"
                  target="_blank"
                  rel="noreferrer"
                >
                  Watch webcast
                </a>
              )}
              {launch.links.wikipedia && (
                <a
                  href={launch.links.wikipedia}
                  className="rounded-full border border-slate/70 bg-night/70 px-4 py-2 text-haze transition hover:border-neon/60 hover:text-neon"
                  target="_blank"
                  rel="noreferrer"
                >
                  Wikipedia
                </a>
              )}
              {launch.links.article && (
                <a
                  href={launch.links.article}
                  className="rounded-full border border-slate/70 bg-night/70 px-4 py-2 text-haze transition hover:border-neon/60 hover:text-neon"
                  target="_blank"
                  rel="noreferrer"
                >
                  Article
                </a>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-slate/70 bg-steel/80 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-haze">Mission Patch</p>
            <div className="mt-6 flex items-center justify-center rounded-2xl border border-slate/70 bg-night/70 p-6">
              {image ? (
                <div className="relative h-56 w-56">
                  <Image src={image} alt={`${launch.name} patch`} fill className="object-contain" />
                </div>
              ) : (
                <div className="text-sm text-haze">No patch available</div>
              )}
            </div>

            {flickrImages.length > 0 && (
              <div className="mt-8">
                <p className="text-sm uppercase tracking-[0.3em] text-haze">Mission Images</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {flickrImages.slice(0, 4).map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="relative aspect-square overflow-hidden rounded-xl border border-slate/70 bg-night/70"
                    >
                      <Image src={url} alt={`${launch.name} photo`} fill className="object-cover" />
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-xs text-haze">Tap an image to open the full gallery.</p>
              </div>
            )}
          </aside>
        </div>
      </main>
    );
  } catch {
    notFound();
  }
}
