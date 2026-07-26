'use client';

import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface DotGridProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'dot' | 'grid';
  opacity?: number;
}

/**
 * DotGrid — CSS-based dot/grid background pattern.
 *
 * Renders a repeating dot or grid pattern via CSS `background-image`.
 * Opacity is clamped to [0.02, 0.05] for readability.
 *
 * @example
 * <DotGrid variant="grid" opacity={0.03} />
 * <DotGrid variant="dot">Children sit on top of the pattern</DotGrid>
 */
const DotGrid = forwardRef<HTMLDivElement, DotGridProps>(
  ({ className, variant = 'dot', opacity = 0.04, style, children, ...props }, ref) => {
    const clampedOpacity = Math.min(0.05, Math.max(0.02, opacity));

    return (
      <div
        ref={ref}
        className={cn(
          'relative',
          variant === 'dot' ? 'dot-bg' : 'grid-bg',
          className,
        )}
        style={{
          ...style,
          opacity: clampedOpacity,
        }}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DotGrid.displayName = 'DotGrid';

export { DotGrid, type DotGridProps };
