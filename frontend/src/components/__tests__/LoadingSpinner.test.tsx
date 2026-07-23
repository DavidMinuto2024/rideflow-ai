import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner, PageSkeleton, CardSkeleton } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders the spinner element', () => {
    render(<LoadingSpinner />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('accepts a custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const container = document.querySelector('.custom-class');
    expect(container).toBeTruthy();
  });
});

describe('PageSkeleton', () => {
  it('renders 3 skeleton blocks', () => {
    const { container } = render(<PageSkeleton />);
    const skeletons = container.querySelectorAll('.animate-pulse > div');
    expect(skeletons.length).toBe(3);
  });
});

describe('CardSkeleton', () => {
  it('renders 3 skeleton lines inside a panel', () => {
    const { container } = render(<CardSkeleton />);
    const lines = container.querySelectorAll('.animate-pulse > div');
    expect(lines.length).toBe(3);
    const panel = container.querySelector('.panel');
    expect(panel).toBeTruthy();
  });
});
