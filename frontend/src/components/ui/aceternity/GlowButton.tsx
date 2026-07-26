'use client';

import { forwardRef } from 'react';
import { Button, type ButtonProps } from '@/components/ui/Button';

/**
 * GlowButton — thin convenience wrapper around Button with `glow-primary` variant default.
 *
 * @example
 * <GlowButton>Click me</GlowButton>
 * <GlowButton variant="glow-accent">Accent glow</GlowButton>
 */
const GlowButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <Button ref={ref} variant="glow-primary" {...props} />,
);
GlowButton.displayName = 'GlowButton';

export { GlowButton };
