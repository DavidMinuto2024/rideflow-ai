'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether to show glow shadow on hover. Default: true */
  glow?: boolean;
  /** Backdrop blur amount in px. Default: 12 */
  blur?: number;
}

/**
 * GlassCard — glassmorphism surface with optional glow hover.
 *
 * Uses the `.glass` utility class for backdrop-blur and semi-transparent bg.
 * The `@supports not (backdrop-filter)` fallback is handled in globals.css.
 *
 * @example
 * <GlassCard glow blur={8}>
 *   <p>Frosted content</p>
 * </GlassCard>
 */
const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = true, blur = 12, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass rounded-xl text-text-primary shadow-sm transition-shadow duration-300',
          glow && 'glow hover:shadow-[0_0_20px_rgb(34_211_238/0.3)]',
          className,
        )}
        style={{
          ...style,
          backdropFilter: style?.backdropFilter ?? `blur(${blur}px)`,
          WebkitBackdropFilter: style?.WebkitBackdropFilter ?? `blur(${blur}px)`,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
GlassCard.displayName = 'GlassCard';

export { GlassCard };
