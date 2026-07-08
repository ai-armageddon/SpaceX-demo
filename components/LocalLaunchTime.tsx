'use client';

import { useEffect, useMemo, useState } from 'react';

type LocalLaunchTimeProps = {
  dateUtc: string;
  launchTimeZone?: string | null;
  className?: string;
  dateClassName?: string;
  detailClassName?: string;
};

type ViewerTimezoneProps = {
  className?: string;
};

function useViewerTimeZone() {
  const [timeZone, setTimeZone] = useState<string | null>(null);

  useEffect(() => {
    setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC');
  }, []);

  return timeZone;
}

function formatInTimeZone(dateUtc: string, timeZone: string, includeTime: boolean) {
  const date = new Date(dateUtc);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: 'numeric',
          minute: '2-digit',
          timeZoneName: 'short'
        }
      : {}),
    timeZone
  }).format(date);
}

export function ViewerTimezone({ className }: ViewerTimezoneProps) {
  const timeZone = useViewerTimeZone();

  return (
    <div className={className}>
      <p className="text-sm text-haze">Your timezone</p>
      <p className="mt-2 min-h-[52px] rounded-xl border border-slate/60 bg-night/70 px-4 py-4 text-sm text-white">
        {timeZone ?? 'Detecting timezone...'}
      </p>
    </div>
  );
}

export default function LocalLaunchTime({
  dateUtc,
  launchTimeZone,
  className,
  dateClassName = 'font-medium text-white',
  detailClassName = 'mt-1 text-xs text-haze'
}: LocalLaunchTimeProps) {
  const viewerTimeZone = useViewerTimeZone();
  const missionTimeZone = launchTimeZone ?? 'UTC';

  const { launchLabel, viewerLabel } = useMemo(
    () => {
      const launchLabel = formatInTimeZone(dateUtc, missionTimeZone, true);
      const viewerLabel =
        viewerTimeZone && viewerTimeZone !== missionTimeZone
          ? formatInTimeZone(dateUtc, viewerTimeZone, true)
          : null;

      return { launchLabel, viewerLabel };
    },
    [dateUtc, missionTimeZone, viewerTimeZone]
  );

  return (
    <div className={className} suppressHydrationWarning>
      <p className={dateClassName}>Launch site: {launchLabel}</p>
      {viewerLabel && <p className={detailClassName}>Your local: {viewerLabel}</p>}
    </div>
  );
}
