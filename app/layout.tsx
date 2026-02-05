import './globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import PageTransition from '@/components/PageTransition';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space'
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono'
});

export const metadata: Metadata = {
  title: 'SpaceX Launches',
  description: 'Explore every SpaceX mission with launch details and flight data.',
  icons: {
    icon: '/icons/favicon.ico',
    apple: '/icons/icon.png'
  },
  openGraph: {
    title: 'SpaceX Launches',
    description: 'Explore every SpaceX mission with launch details and flight data.',
    images: ['/icons/icon.png']
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body>
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(21,32,45,0.9),#0b0e12_55%)]">
          <header className="border-b border-slate/60 bg-midnight/60 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
              <div className="flex items-center gap-4">
                <Image src="/brand/spacex-logo.png" alt="SpaceX" width={140} height={28} priority />
                <div>
                  <p className="text-sm uppercase tracking-[0.32em] text-haze">SpaceX Intelligence</p>
                  <h1 className="text-2xl font-semibold">Launch Archive</h1>
                </div>
              </div>
              <div className="hidden items-center gap-2 text-sm text-haze md:flex">
                <span className="inline-flex h-2 w-2 rounded-full bg-neon shadow-glow" />
                Community SpaceX data
              </div>
            </div>
          </header>
          <PageTransition>{children}</PageTransition>
          <footer className="border-t border-slate/60 bg-midnight/60">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-haze sm:flex-row sm:items-center sm:justify-between">
              <p>
                Data provided by the community SpaceX API. This site is not powered by an official SpaceX API.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="https://docs.spacexdata.com/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neon/80 underline-offset-4 transition hover:text-neon hover:underline"
                >
                  docs.spacexdata.com
                </a>
                <a
                  href="https://x.com/jeremyboulerice"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-haze transition hover:text-white"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-current"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.505 11.24H16.1l-5.302-6.932-6.064 6.932H1.426l7.73-8.83L1 2.25h6.908l4.79 6.322L18.244 2.25zm-1.16 17.52h1.833L6.63 4.126H4.667L17.084 19.77z" />
                  </svg>
                  @jeremyboulerice
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
