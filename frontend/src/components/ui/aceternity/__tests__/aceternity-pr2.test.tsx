import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from '../GlassCard';
import { GlowButton } from '../GlowButton';
import { ShimmerBadge } from '../ShimmerBadge';
import { AnimatedBorder } from '../AnimatedBorder';
import { Button, buttonVariants } from '../../Button';
import { Badge, badgeVariants } from '../../Badge';
import { Card } from '../../Card';
import { Input } from '../../Input';
import { Modal } from '../../Modal';

function mockNoBackdropFilter() {
  vi.spyOn(CSS, 'supports').mockImplementation(
    (property: string, value: string): boolean => {
      if (property === 'backdrop-filter' && value === 'blur(1px)') {
        return false;
      }
      return true;
    },
  );
}

function mockReducedMotion() {
  return vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string): MediaQueryList => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: () => false,
    }),
  );
}

// ──────────────────────────────────────────────
// TASK 2.1 — GlassCard
// ──────────────────────────────────────────────
describe('GlassCard (2.1)', () => {
  it('renders a div with glass class by default', () => {
    const { container } = render(<GlassCard />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.tagName).toBe('DIV');
    expect(el.className).toContain('glass');
  });

  it('renders children', () => {
    render(
      <GlassCard>
        <span data-testid="child">Content</span>
      </GlassCard>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(<GlassCard className="my-class" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('my-class');
  });

  it('applies glow class by default', () => {
    const { container } = render(<GlassCard glow />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('glow');
  });

  it('does not apply glow class when glow=false', () => {
    const { container } = render(<GlassCard glow={false} />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain('glow');
  });

  it('applies custom blur via inline style', () => {
    const { container } = render(<GlassCard blur={8} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.backdropFilter).toContain('8px');
  });
});

// ──────────────────────────────────────────────
// TASK 2.2 — GlowButton + ShimmerBadge
// ──────────────────────────────────────────────
describe('GlowButton (2.2)', () => {
  it('renders a button', () => {
    render(<GlowButton>Click</GlowButton>);
    const btn = screen.getByRole('button', { name: /click/i });
    expect(btn).toBeTruthy();
  });

  it('uses glow-primary variant by default', () => {
    render(<GlowButton>Glow</GlowButton>);
    const btn = screen.getByRole('button');
    // glow-primary adds a cyan shadow via Tailwind arbitrary value
    expect(btn.className).toContain('shadow-[');
    // Raw Tailwind uses decimal RGB in arbitrary values: rgb(34_211_238/0.3)
    expect(btn.className).toContain('34_211_238');
  });
});

describe('ShimmerBadge (2.2)', () => {
  it('renders a badge', () => {
    render(<ShimmerBadge>New</ShimmerBadge>);
    const badge = screen.getByText('New');
    expect(badge).toBeTruthy();
  });

  it('uses shimmer variant by default', () => {
    render(<ShimmerBadge>Shimmer</ShimmerBadge>);
    const badge = screen.getByText('Shimmer');
    expect(badge.className).toContain('shimmer');
  });
});

// ──────────────────────────────────────────────
// TASK 2.3 — AnimatedBorder
// ──────────────────────────────────────────────
describe('AnimatedBorder (2.3)', () => {
  it('renders a div with animated-border class', () => {
    const { container } = render(<AnimatedBorder />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('animated-border');
  });

  it('renders children', () => {
    render(
      <AnimatedBorder>
        <span data-testid="child">Inner</span>
      </AnimatedBorder>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('accepts custom className', () => {
    const { container } = render(<AnimatedBorder className="custom" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('custom');
  });

  it('respects prefers-reduced-motion by adding reduce-motion class', () => {
    const mock = mockReducedMotion();

    const { container } = render(<AnimatedBorder />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('reduce-motion');

    mock.mockRestore();
  });
});

// ──────────────────────────────────────────────
// TASK 2.4 — CVA Variants (Button + Badge)
// ──────────────────────────────────────────────
describe('Button CVA — glow/glass variants (2.4)', () => {
  it('glow-primary variant adds cyan glow shadow', () => {
    const { container } = render(<Button variant="glow-primary">GP</Button>);
    const btn = container.firstChild as HTMLElement;
    // Raw Tailwind arbitrary value uses decimal RGB: rgb(34_211_238/…)
    expect(btn.className).toContain('shadow-[');
    expect(btn.className).toContain('34_211_238');
  });

  it('glow-accent variant adds amber glow shadow', () => {
    const { container } = render(<Button variant="glow-accent">GA</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain('shadow-[');
    expect(btn.className).toContain('232_163_61');
  });

  it('glass-primary variant uses semi-transparent surface bg', () => {
    const { container } = render(<Button variant="glass-primary">GlassP</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain('bg-surface/60');
    expect(btn.className).toContain('backdrop-blur');
  });

  it('glass-accent variant uses semi-transparent surface bg with accent text', () => {
    const { container } = render(<Button variant="glass-accent">GlassA</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain('bg-surface/60');
    expect(btn.className).toContain('text-accent');
  });

  it('CVA resolves glow-primary via buttonVariants fn', () => {
    const cls = buttonVariants({ variant: 'glow-primary' });
    expect(cls).toContain('shadow-[');
    expect(cls).toContain('34_211_238');
  });
});

describe('Badge CVA — shimmer variant (2.4)', () => {
  it('renders shimmer variant', () => {
    const { container } = render(<Badge variant="shimmer">Shimmer</Badge>);
    const badge = container.firstChild as HTMLElement;
    expect(badge.className).toContain('shimmer');
  });

  it('CVA resolves shimmer using badgeVariants fn', () => {
    const cls = badgeVariants({ variant: 'shimmer' });
    expect(cls).toContain('shimmer');
  });
});

// ──────────────────────────────────────────────
// TASK 2.5 — Glass props (Card, Input, Modal)
// ──────────────────────────────────────────────
describe('Card — glass/glow support (2.5)', () => {
  it('renders glass styling when glass prop is true', () => {
    const { container } = render(<Card glass>Glass Card</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('bg-surface/60');
    expect(el.className).toContain('backdrop-blur');
  });

  it('does not add glass classes when glass prop is false/undefined', () => {
    const { container } = render(<Card>Normal Card</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain('bg-surface/60');
  });

  it('adds glow hover class when glow prop is true', () => {
    const { container } = render(<Card glow>Glow Card</Card>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('glow');
  });
});

describe('Input — glass variant (2.5)', () => {
  it('renders glass styles when glass prop is true', () => {
    render(<Input glass placeholder="glass input" />);
    const input = screen.getByPlaceholderText('glass input');
    expect(input.className).toContain('bg-surface/60');
    expect(input.className).toContain('backdrop-blur');
  });
});

describe('Modal — glass panel (2.5)', () => {
  it('renders glass on panel when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="Test">
        Content
      </Modal>,
    );
    // The modal panel (role="dialog") should have glass classes
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('glass');
  });

  it('close button has glow hover effect', () => {
    render(
      <Modal open onClose={vi.fn()} title="Test">
        Content
      </Modal>,
    );
    const closeBtn = screen.getByLabelText('Close');
    expect(closeBtn.className).toContain('glow');
  });
});
