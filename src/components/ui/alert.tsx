import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, string> = {
  info: 'bg-surface-muted text-foreground ring-border',
  success: 'bg-brand-soft text-brand-strong ring-brand/30',
  warning: 'bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300',
  danger: 'bg-red-500/10 text-red-700 ring-red-500/30 dark:text-red-300',
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-xl px-4 py-3 text-sm ring-1', TONES[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && 'mt-1')}>{children}</div>}
    </div>
  );
}
