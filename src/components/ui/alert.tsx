import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, string> = {
  info: 'bg-surface-muted text-foreground ring-border',
  success: 'bg-brand-soft text-brand-strong ring-brand/30',
  warning: 'bg-brand-soft text-brand-strong ring-brand/30',
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
      
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && 'mt-1')}>{children}</div>}
    </div>
  );
}
