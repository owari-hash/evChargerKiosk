import { passwordScore } from '@/lib/auth/password';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

const TONES = ['bg-surface-muted', 'bg-danger', 'bg-warning', 'bg-brand', 'bg-brand'] as const;

/**
 * Live strength meter for the sign-up and reset forms. The wrapper stays mounted so
 * the polite live region exists before the label starts changing.
 */
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, label } = passwordScore(password);
  const filled = password ? score : 0;

  return (
    <div className={cn('space-y-1.5', className)}>
      {password && (
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                step <= filled ? TONES[filled] : 'bg-surface-muted',
              )}
            />
          ))}
        </div>
      )}
      <p className="text-sm text-muted" aria-live="polite">
        {password ? `Password strength: ${label}` : ''}
      </p>
    </div>
  );
}
