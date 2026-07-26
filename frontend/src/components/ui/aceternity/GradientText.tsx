'use client';

import { useEffect, useState, type ReactNode, type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type HeadingTag = 'h1' | 'h2' | 'h3' | 'span';

interface GradientTextProps extends HTMLAttributes<HTMLElement> {
  from?: string;
  to?: string;
  shimmer?: boolean;
  as?: HeadingTag;
  children: ReactNode;
}

/**
 * GradientText — Gradient text with optional shimmer animation.
 *
 * Renders text with `background-clip: text` using a CSS gradient.
 * Optionally applies a shimmer sweep animation that respects
 * `prefers-reduced-motion`.
 *
 * @example
 * <GradientText as="h1">Welcome to RideFlow</GradientText>
 * <GradientText from="#ff0000" to="#00ff00" shimmer={false}>Static Gradient</GradientText>
 */
const GradientText = forwardRef<HTMLHeadingElement, GradientTextProps>(
  (
    {
      className,
      from = '#22d3ee',
      to = '#e8a33d',
      shimmer = true,
      as: Tag = 'h1',
      style,
      children,
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

    const shouldShimmer = shimmer && !prefersReducedMotion;

    return (
      <Tag
        ref={ref}
        className={cn(
          'gradient-text',
          shouldShimmer && 'shimmer',
          prefersReducedMotion && 'reduce-motion',
          className,
        )}
        style={
          {
            ...style,
            '--gradient-from': from,
            '--gradient-to': to,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </Tag>
    );
  },
);
GradientText.displayName = 'GradientText';

export { GradientText, type GradientTextProps, type HeadingTag };
