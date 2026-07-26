'use client';

import { forwardRef, type HTMLAttributes, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedBorderProps extends HTMLAttributes<HTMLDivElement> {
  /** Conic gradient start color. Default: cyan (#22d3ee) */
  from?: string;
  /** Conic gradient end color. Default: amber (#e8a33d) */
  to?: string;
}

/**
 * AnimatedBorder — container with rotating conic gradient border via ::before pseudo-element.
 *
 * Uses the `.animated-border` CSS utility from globals.css.
 * Disables rotation animation when `prefers-reduced-motion: reduce`.
 *
 * @example
 * <AnimatedBorder>
 *   <p>Content inside animated border</p>
 * </AnimatedBorder>
 */
const AnimatedBorder = forwardRef<HTMLDivElement, AnimatedBorderProps>(
  ({ className, from = '#22d3ee', to = '#e8a33d', style, children, ...props }, ref) => {
    const [reduceMotion, setReduceMotion] = useState(false);

    useEffect(() => {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(mq.matches);
      const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }, []);

    return (
      <div
        ref={ref}
        className={cn(
          'animated-border',
          reduceMotion && 'reduce-motion',
          className,
        )}
        style={{
          ...style,
          '--border-from': from,
          '--border-to': to,
        } as React.CSSProperties}
        {...props}
      >
        {children}
      </div>
    );
  },
);
AnimatedBorder.displayName = 'AnimatedBorder';

export { AnimatedBorder };
