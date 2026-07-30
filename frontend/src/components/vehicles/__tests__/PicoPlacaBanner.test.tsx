import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUsePicoYPlaca = vi.fn();

vi.mock('@/lib/queries/event-vehicles', () => ({
  usePicoYPlaca: (...args: any[]) => mockUsePicoYPlaca(...args),
}));

import { PicoPlacaBanner } from '../PicoPlacaBanner';

describe('PicoPlacaBanner (#11)', () => {
  it('renders null when active is false', () => {
    mockUsePicoYPlaca.mockReturnValue({ data: { active: false }, isLoading: false });

    const { container } = render(<PicoPlacaBanner active={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders warning alert banner when active is true', () => {
    mockUsePicoYPlaca.mockReturnValue({ data: { active: true, message: 'Placa terminada en 4 con restricción hoy' } });

    render(<PicoPlacaBanner active={true} message="Placa terminada en 4 con restricción hoy" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/restricción de pico y placa/i)).toBeInTheDocument();
    expect(screen.getByText(/placa terminada en 4/i)).toBeInTheDocument();
  });

  it('fetches restriction status via hook when eventVehicleId is provided', () => {
    mockUsePicoYPlaca.mockReturnValue({
      data: { active: true, message: 'Restricción por hora pico' },
      isLoading: false,
    });

    render(<PicoPlacaBanner eventVehicleId="ev-123" />);

    expect(mockUsePicoYPlaca).toHaveBeenCalledWith('ev-123');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/restricción por hora pico/i)).toBeInTheDocument();
  });
});
