import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams('orgId=org-1'),
}));

// Mock queries
vi.mock('@/lib/queries/organizations', () => ({
  useOrganizations: () => ({
    data: [{ id: 'org-1', name: 'Org 1' }],
    isLoading: false,
  }),
}));

vi.mock('@/lib/queries/events', () => ({
  useCreateEvent: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import NewEventPage from '../page';

describe('NewEventPage — ArrivalTime', () => {
  it('renders arrivalTime input as required', async () => {
    render(<NewEventPage />);

    const arrivalInput = screen.getByLabelText(/hora de llegada/i);
    expect(arrivalInput).toBeInTheDocument();
    expect(arrivalInput).toHaveAttribute('type', 'datetime-local');
    expect(arrivalInput).toBeRequired();
  });

  it('does NOT render origin field', async () => {
    render(<NewEventPage />);

    expect(screen.queryByLabelText(/origen/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/dirección de salida/i)).not.toBeInTheDocument();
  });
});
