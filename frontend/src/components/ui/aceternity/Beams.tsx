'use client';

import { useEffect, useState, type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface BeamsProps extends HTMLAttributes<HTMLDivElement> {
  colors?: [string, string];
  intensity?: 'subtle' | 'medium' | 'strong';
}

const INTENSITY_CLASS: Record<string, string> = {
  subtle: '',
  medium: 'intensity-medium',
  strong: 'intensity-strong',
};

/**
 * Beams — Decorative animated gradient rays.
 *
 * Renders a `conic-gradient` on a `::before` pseudo-element that
 * animates via CSS keyframes. Disables animation when
 * `prefers-reduced-motion: reduce` is active.
 *
 * @example
 * <Beams />
 * <Beams colors={['#ff0000', '#00ff00']} intensity="strong" />
 */
const Beams = forwardRef<HTMLDivElement, BeamsProps>(
  (
    {
      className,
      colors = ['#22d3ee', '#e8a33d'],
      intensity = 'subtle',
      style,
      ...props
    },
    ref,
  ) => {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          'beams',
          INTENSITY_CLASS[intensity] ?? '',
          prefersReducedMotion && 'reduce-motion',
          className,
        )}
        style={
          {
            ...style,
            '--beam-from': colors[0],
            '--beam-to': colors[1],
          } as React.CSSProperties
        }
        {...props}
      />
    );
  },
);
Beams.displayName = 'Beams';

export { Beams, type BeamsProps };
