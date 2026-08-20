import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends ComponentProps<'span'> {
  /** Pass a tone from `connectorStatusTone()` or any ring/bg/text class trio. */
  tone?: string;
}

export function Badge({ className, tone, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1',
        tone ?? 'bg-surface-muted text-muted ring-border',
        className,
      )}
    />
  );
}
