import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DotGrid } from '../DotGrid';
import { Beams } from '../Beams';
import { GradientText } from '../GradientText';

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

describe('DotGrid', () => {
  it('renders with default props', () => {
    const { container } = render(<DotGrid />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.tagName).toBe('DIV');
  });

  it('accepts custom className', () => {
    const { container } = render(<DotGrid className="custom-class" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom-class');
  });

  it('renders dot variant by default', () => {
    const { container } = render(<DotGrid variant="dot" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('dot-bg');
  });

  it('renders grid variant', () => {
    const { container } = render(<DotGrid variant="grid" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('grid-bg');
  });

  it('clamps opacity to minimum 0.02', () => {
    const { container } = render(<DotGrid opacity={0.01} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.opacity).toBe('0.02');
  });

  it('clamps opacity to maximum 0.05', () => {
    const { container } = render(<DotGrid opacity={0.08} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.opacity).toBe('0.05');
  });

  it('passes through valid opacity between 0.02 and 0.05', () => {
    const { container } = render(<DotGrid opacity={0.03} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.opacity).toBe('0.03');
  });

  it('renders children when provided', () => {
    render(
      <DotGrid>
        <span data-testid="child">Child content</span>
      </DotGrid>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });
});

describe('Beams', () => {
  it('renders without crashing', () => {
    const { container } = render(<Beams />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.tagName).toBe('DIV');
  });

  it('accepts custom className', () => {
    const { container } = render(<Beams className="custom-beams" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom-beams');
  });

  it('renders with default intensity', () => {
    const { container } = render(<Beams />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('beams');
  });

  it('renders with custom colors', () => {
    const { container } = render(<Beams colors={['#ff0000', '#00ff00']} />);
    const div = container.firstChild as HTMLElement;
    expect(div).toBeTruthy();
    expect(div.style.getPropertyValue('--beam-from')).toBe('#ff0000');
    expect(div.style.getPropertyValue('--beam-to')).toBe('#00ff00');
  });

  it('renders with different intensity levels', () => {
    const { container } = render(<Beams intensity="strong" />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('intensity-strong');
  });

  it('respects prefers-reduced-motion by adding reduced-motion class', () => {
    const mock = mockReducedMotion();

    const { container } = render(<Beams />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('reduce-motion');

    mock.mockRestore();
  });
});

describe('GradientText', () => {
  it('renders as h1 by default', () => {
    render(<GradientText>Hello World</GradientText>);
    const heading = screen.getByText('Hello World');
    expect(heading.tagName).toBe('H1');
  });

  it('renders as h2 when specified', () => {
    render(<GradientText as="h2">Heading 2</GradientText>);
    const heading = screen.getByText('Heading 2');
    expect(heading.tagName).toBe('H2');
  });

  it('renders as h3 when specified', () => {
    render(<GradientText as="h3">Heading 3</GradientText>);
    const heading = screen.getByText('Heading 3');
    expect(heading.tagName).toBe('H3');
  });

  it('renders as span when specified', () => {
    render(<GradientText as="span">Span text</GradientText>);
    const span = screen.getByText('Span text');
    expect(span.tagName).toBe('SPAN');
  });

  it('applies shimmer class by default', () => {
    const { container } = render(<GradientText>Shimmer</GradientText>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('shimmer');
  });

  it('does not apply shimmer class when shimmer=false', () => {
    const { container } = render(
      <GradientText shimmer={false}>No Shimmer</GradientText>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain('shimmer');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <GradientText className="custom-grad">Custom</GradientText>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('custom-grad');
  });

  it('disables shimmer when prefers-reduced-motion is active', () => {
    const mock = mockReducedMotion();

    const { container } = render(<GradientText>Reduced</GradientText>);
    const el = container.firstChild as HTMLElement;
    expect(el.className).not.toContain('shimmer');

    mock.mockRestore();
  });

  it('applies custom from/to gradient colors via style', () => {
    const { container } = render(
      <GradientText from="#ff0000" to="#00ff00">
        Custom Colors
      </GradientText>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.style.getPropertyValue('--gradient-from')).toBe('#ff0000');
    expect(el.style.getPropertyValue('--gradient-to')).toBe('#00ff00');
  });
});
