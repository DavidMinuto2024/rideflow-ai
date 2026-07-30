'use client';

import { usePicoYPlaca } from '@/lib/queries/event-vehicles';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PicoPlacaBannerProps {
  eventVehicleId?: string;
  active?: boolean;
  message?: string;
  className?: string;
}

export function PicoPlacaBanner({
  eventVehicleId,
  active: propActive,
  message: propMessage,
  className,
}: PicoPlacaBannerProps) {
  const { data } = usePicoYPlaca(eventVehicleId ?? '');

  const isActive = propActive ?? data?.active ?? false;
  const message = propMessage ?? data?.message ?? 'Vehículo con restricción de Pico y Placa activa en la fecha del evento.';

  if (!isActive) return null;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-400 text-sm font-medium shadow-sm',
        className,
      )}
    >
      <ShieldAlert className="size-5 shrink-0 text-amber-400 mt-0.5" />
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 font-semibold text-amber-300">
          <AlertTriangle className="size-4" />
          <span>Restricción de Pico y Placa</span>
        </div>
        <p className="text-xs text-amber-200/90 leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
