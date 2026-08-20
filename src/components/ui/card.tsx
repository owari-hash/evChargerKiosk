import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-2xl bg-surface ring-1 ring-border shadow-[var(--shadow-card)]',
        className,
      )}
    />
  );
}

export function CardHeader({ className, ...rest }: ComponentProps<'div'>) {
  return <div {...rest} className={cn('border-b border-border px-5 py-4', className)} />;
}

export function CardTitle({ className, ...rest }: ComponentProps<'h2'>) {
  return <h2 {...rest} className={cn('text-base font-semibold text-foreground', className)} />;
}

export function CardBody({ className, ...rest }: ComponentProps<'div'>) {
  return <div {...rest} className={cn('px-5 py-4', className)} />;
}
