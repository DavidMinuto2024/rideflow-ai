import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: 'bg-primary text-black hover:bg-primary-hover',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border bg-surface text-text-primary hover:bg-surface-hover',
        secondary: 'bg-secondary text-white hover:bg-secondary/80',
        ghost: 'text-text-primary hover:bg-surface-hover',
        link: 'text-primary underline-offset-4 hover:underline',
        'glow-primary':
          'bg-primary text-black hover:bg-primary-hover shadow-[0_0_12px_rgb(34_211_238/0.3)] hover:shadow-[0_0_20px_rgb(34_211_238/0.5)] transition-shadow duration-300',
        'glow-accent':
          'bg-accent text-black hover:bg-accent/90 shadow-[0_0_12px_rgb(232_163_61/0.3)] hover:shadow-[0_0_20px_rgb(232_163_61/0.5)] transition-shadow duration-300',
        'glass-primary':
          'bg-surface/60 backdrop-blur-[12px] border border-border/50 text-primary hover:bg-surface/80 transition-all duration-300',
        'glass-accent':
          'bg-surface/60 backdrop-blur-[12px] border border-border/50 text-accent hover:bg-surface/80 transition-all duration-300',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="size-4 shrink-0 animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
