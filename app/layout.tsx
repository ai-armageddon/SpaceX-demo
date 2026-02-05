import './globals.css';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';

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
                Live data from SpaceX API
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
