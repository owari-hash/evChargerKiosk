import type { StationAvailability } from '@/lib/types';
import { availabilityLabel, availabilityTone, cn } from '@/lib/utils';

interface AvailabilityDotProps {
  availability: StationAvailability;
  className?: string;
}

/** Colour alone never carries meaning here — always pair the dot with its label. */
export function AvailabilityDot({ availability, className }: AvailabilityDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        availabilityTone(availability),
        className,
      )}
    />
  );
}

interface AvailabilityStatusProps {
  availability: StationAvailability;
  className?: string;
  /** Defaults to the product locale (Mongolian) when the caller has none. */
  locale?: string;
}

export function AvailabilityStatus({ availability, className, locale }: AvailabilityStatusProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-2 text-sm font-medium text-foreground', className)}
    >
      <AvailabilityDot availability={availability} />
      {availabilityLabel(availability, locale)}
    </span>
  );
}
