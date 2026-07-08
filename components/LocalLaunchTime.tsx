'use client';

import { useEffect, useMemo, useState } from 'react';

type LocalLaunchTimeProps = {
  dateUtc: string;
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
  className,
  dateClassName = 'font-medium text-white',
  detailClassName = 'mt-1 text-xs text-haze'
}: LocalLaunchTimeProps) {
  const viewerTimeZone = useViewerTimeZone();
  const timeZone = viewerTimeZone ?? 'UTC';

  const { dateLabel, detailLabel } = useMemo(
    () => ({
      dateLabel: formatInTimeZone(dateUtc, timeZone, false),
      detailLabel: formatInTimeZone(dateUtc, timeZone, true)
    }),
    [dateUtc, timeZone]
  );

  return (
    <div className={className} suppressHydrationWarning>
      <p className={dateClassName}>{dateLabel}</p>
      <p className={detailClassName}>{detailLabel}</p>
    </div>
  );
}
