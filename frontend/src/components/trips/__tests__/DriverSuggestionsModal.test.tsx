import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockUseSuggestions = vi.fn();

vi.mock('@/lib/queries/suggestions', () => ({
  useSuggestions: (...args: any[]) => mockUseSuggestions(...args),
}));

import { DriverSuggestionsModal } from '../DriverSuggestionsModal';

describe('DriverSuggestionsModal (#10)', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    eventId: 'event-100',
    onSelectDriver: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when query is loading', () => {
    mockUseSuggestions.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<DriverSuggestionsModal {...defaultProps} />);

    expect(screen.getByText(/sugerencias de conductores cerca/i)).toBeInTheDocument();
  });

  it('renders empty message when no suggestions found', () => {
    mockUseSuggestions.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<DriverSuggestionsModal {...defaultProps} />);

    expect(
      screen.getByText(/no hay pasajeros pendientes o conductores sugeridos/i),
    ).toBeInTheDocument();
  });

  it('renders list of driver suggestions with match score and triggers callback on select', () => {
    mockUseSuggestions.mockReturnValue({
      data: [
        {
          passengerId: 'p-1',
          passengerName: 'Carlos Pasajero',
          pickupAddress: 'Calle 100',
          suggestions: [
            {
              driverId: 'd-1',
              driverName: 'Juan Conductor',
              vehicleId: 'v-1',
              vehicleModel: 'Toyota Corolla',
              capacity: 4,
              distanceFromPassenger: 1500,
              score: 95,
            },
          ],
        },
      ],
      isLoading: false,
      isError: false,
    });

    render(<DriverSuggestionsModal {...defaultProps} />);

    expect(screen.getByText('Carlos Pasajero')).toBeInTheDocument();
    expect(screen.getByText('Juan Conductor')).toBeInTheDocument();
    expect(screen.getByText(/95% coincidencia/i)).toBeInTheDocument();

    const selectBtn = screen.getByRole('button', { name: /seleccionar/i });
    fireEvent.click(selectBtn);

    expect(defaultProps.onSelectDriver).toHaveBeenCalledWith('d-1', 'v-1');
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
