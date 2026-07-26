'use client';

import { forwardRef } from 'react';
import { Badge, type BadgeProps } from '@/components/ui/Badge';

/**
 * ShimmerBadge — thin convenience wrapper around Badge with `shimmer` variant default.
 *
 * @example
 * <ShimmerBadge>New</ShimmerBadge>
 * <ShimmerBadge variant="success">Live</ShimmerBadge>
 */
const ShimmerBadge = forwardRef<HTMLDivElement, BadgeProps>(
  (props, ref) => <Badge ref={ref} variant="shimmer" {...props} />,
);
ShimmerBadge.displayName = 'ShimmerBadge';

export { ShimmerBadge };
