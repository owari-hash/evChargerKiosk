import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const CONTROL =
  'w-full rounded-xl bg-surface px-3.5 py-2.5 text-sm text-foreground ring-1 ring-border ' +
  'placeholder:text-muted/70 transition focus:ring-2 focus:ring-brand disabled:opacity-60 ' +
  'aria-[invalid=true]:ring-danger';

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input {...rest} className={cn(CONTROL, 'h-11', className)} />;
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <select {...rest} className={cn(CONTROL, 'h-11 pr-8', className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea {...rest} className={cn(CONTROL, 'min-h-24 resize-y', className)} />;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/** Label + control + hint/error, wired for screen readers via aria-describedby. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
