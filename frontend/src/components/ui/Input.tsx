import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  /** Apply glassmorphism style — backdrop-blur + glow focus ring. */
  glass?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, glass, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        aria-invalid={error ? true : undefined}
        className={cn(
          'flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm shadow-sm transition-all duration-300',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-text-muted',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
          error && 'border-destructive',
          glass &&
            'bg-surface/60 backdrop-blur-[12px] focus-visible:shadow-[0_0_12px_rgb(34_211_238/0.3)]',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
