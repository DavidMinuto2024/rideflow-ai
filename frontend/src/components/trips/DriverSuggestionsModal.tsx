'use client';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSuggestions, type EventSuggestions, type DriverSuggestion } from '@/lib/queries/suggestions';
import { Car, UserCheck, MapPin, Sparkles } from 'lucide-react';

export interface DriverSuggestionsModalProps {
  open: boolean;
  onClose: () => void;
  eventId: string;
  onSelectDriver?: (driverId: string, vehicleId: string) => void;
}

export function DriverSuggestionsModal({
  open,
  onClose,
  eventId,
  onSelectDriver,
}: DriverSuggestionsModalProps) {
  const { data: suggestionsGroup, isLoading, isError } = useSuggestions(eventId, open);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sugerencias de Conductores Cerca"
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-text-secondary">
          Algoritmo de afinidad geográfica y capacidad para emparejar pasajeros con conductores ideales.
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center text-sm text-destructive">
            Error al obtener las sugerencias de conductores.
          </div>
        ) : !suggestionsGroup || suggestionsGroup.length === 0 ? (
          <div className="p-6 text-center text-text-muted">
            <Car className="mx-auto mb-2 size-8 opacity-50" />
            <p className="text-sm">No hay pasajeros pendientes o conductores sugeridos.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1">
            {suggestionsGroup.map((group: EventSuggestions) => (
              <div
                key={group.passengerId}
                className="rounded-lg border border-border bg-surface/50 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    <span className="font-medium text-sm text-text-primary">
                      {group.passengerName}
                    </span>
                  </div>
                  {group.pickupAddress && (
                    <span className="text-xs text-text-muted truncate max-w-[200px]">
                      {group.pickupAddress}
                    </span>
                  )}
                </div>

                <div className="space-y-2 border-t border-border/50 pt-2">
                  {group.suggestions.length === 0 ? (
                    <p className="text-xs text-text-muted italic">Sin conductores cercanos disponibles</p>
                  ) : (
                    group.suggestions.map((suggestion: DriverSuggestion) => (
                      <div
                        key={suggestion.driverId}
                        className="flex items-center justify-between rounded-md bg-surface-hover/50 p-2.5 transition hover:bg-surface-hover"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Car className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-medium text-text-primary">
                                {suggestion.driverName}
                              </p>
                              <Badge variant="info" className="text-[10px] px-1.5 py-0">
                                <Sparkles className="mr-0.5 size-3 inline" />
                                {suggestion.score}% coincidencia
                              </Badge>
                            </div>
                            <p className="text-[11px] text-text-secondary">
                              {suggestion.vehicleModel} • {suggestion.capacity} cupos • {(suggestion.distanceFromPassenger / 1000).toFixed(1)} km
                            </p>
                          </div>
                        </div>

                        {onSelectDriver && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2.5"
                            onClick={() => {
                              onSelectDriver(suggestion.driverId, suggestion.vehicleId);
                              onClose();
                            }}
                          >
                            <UserCheck className="mr-1 size-3.5" />
                            Seleccionar
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
