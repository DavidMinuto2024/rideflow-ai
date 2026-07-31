'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, XCircle, CheckCircle2, Car, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useInviteInfo, useJoinEvent, type JoinRole } from '@/lib/queries/invitations';
import { useVehicles } from '@/lib/queries/vehicles';
import { useCreateVehicle } from '@/lib/queries/vehicles';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { GlassCard } from '@/components/ui/aceternity/GlassCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ApiError } from '@/lib/api';
import { PicoPlacaBanner } from '@/components/vehicles/PicoPlacaBanner';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import {
  checkPicoYPlacaClient,
  DAY_NAMES_ES,
} from '@/lib/utils/pico-placa';

type Step = 'loading' | 'event-info' | 'role-select' | 'driver-form' | 'passenger-form' | 'success' | 'error';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState<Step>('loading');
  const [role, setRole] = useState<JoinRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Pico y Placa state
  const [picoYPlacaActive, setPicoYPlacaActive] = useState(false);
  const [picoYPlacaMessage, setPicoYPlacaMessage] = useState<string>('');

  // Invite data
  const { data: eventInfo, isLoading: infoLoading, error: infoError } = useInviteInfo(token);

  // Driver form state
  const [orgId, setOrgId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(4);
  const [startLocation, setStartLocation] = useState('');
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);

  // Passenger form state
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles(orgId);
  const createVehicle = useCreateVehicle(orgId);
  const joinEvent = useJoinEvent(token);

  // Resolve orgId from event info
  useEffect(() => {
    const resolvedOrgId =
      eventInfo?.organizationId ?? eventInfo?.organization?.id;
    if (resolvedOrgId) {
      setOrgId(resolvedOrgId);
    }
  }, [eventInfo]);

  // Pico y Placa computation - watches selected vehicle and event date
  useEffect(() => {
    if (!selectedVehicleId || !eventInfo?.date || !vehicles) {
      setPicoYPlacaActive(false);
      setPicoYPlacaMessage('');
      return;
    }

    const vehicle = vehicles.find((v) => v.id === selectedVehicleId);
    if (!vehicle?.plate) {
      setPicoYPlacaActive(false);
      setPicoYPlacaMessage('');
      return;
    }

    const eventDate = new Date(eventInfo.date);
    const isRestricted = checkPicoYPlacaClient(vehicle.plate, eventDate);

    if (isRestricted) {
      const dayOfWeek = eventDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      const dayCodes: Record<number, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = {
        1: 'Mon',
        2: 'Tue',
        3: 'Wed',
        4: 'Thu',
        5: 'Fri',
      };
      const dayCode = dayCodes[dayOfWeek];
      const lastDigit = vehicle.plate.slice(-1);
      const dayNameES = dayCode ? DAY_NAMES_ES[dayCode] : '';
      setPicoYPlacaActive(true);
      setPicoYPlacaMessage(
        `Restricción Pico y Placa: ${dayNameES} aplica (dígito ${lastDigit})`,
      );
    } else {
      setPicoYPlacaActive(false);
      setPicoYPlacaMessage('');
    }
  }, [selectedVehicleId, eventInfo?.date, vehicles]);

  // Determine initial step based on auth + data state
  useEffect(() => {
    if (authLoading || infoLoading) {
      setStep('loading');
      return;
    }

    if (infoError || (!infoLoading && !eventInfo)) {
      setStep('error');
      setErrorMessage(infoError instanceof ApiError ? infoError.message : 'Invitación inválida o expirada');
      return;
    }

    if (!user) {
      // Not authenticated — redirect to login preserving token
      const loginUrl = `/login?redirectTo=${encodeURIComponent(`/invite/${token}`)}`;
      router.push(loginUrl);
      return;
    }

    if (eventInfo) {
      setStep('event-info');
    }
  }, [authLoading, infoLoading, user, eventInfo, infoError, token, router]);

  const handleRoleSelect = (selected: JoinRole) => {
    setRole(selected);
    setStep(selected === 'DRIVER' ? 'driver-form' : 'passenger-form');
  };

  const handleDriverJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    let vehicleId = selectedVehicleId;

    if (showNewVehicleForm) {
      try {
        const newVehicle = await createVehicle.mutateAsync({
          plate: newVehiclePlate || undefined,
          model: newVehicleModel || undefined,
          capacity: newVehicleCapacity,
        });
        vehicleId = newVehicle.id;
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : 'Error al crear vehículo');
        return;
      }
    }

    if (!vehicleId) {
      setErrorMessage('Selecciona o registra un vehículo');
      return;
    }

    try {
      const result = await joinEvent.mutateAsync({
        role: 'DRIVER',
        vehicleId,
        startLocation: startLocation || undefined,
        startLat: startLat ?? undefined,
        startLng: startLng ?? undefined,
      });
      setSuccessMessage(result.message);
      setStep('success');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Error al unirse al evento');
    }
  };

  const handlePassengerJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!pickupAddress) {
      setErrorMessage('Ingresa tu dirección de recogida');
      return;
    }

    try {
      const result = await joinEvent.mutateAsync({
        role: 'PASSENGER',
        pickupAddress,
        pickupLat: pickupLat ?? undefined,
        pickupLng: pickupLng ?? undefined,
      });
      setSuccessMessage(result.message);
      setStep('success');
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : 'Error al unirse al evento');
    }
  };

  // ── Loading ──────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
          <p className="text-text-secondary">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <GlassCard glow className="w-full max-w-md p-0">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto mb-4 size-12 text-destructive" />
            <h1 className="mb-2 text-xl font-display font-bold">Invitación inválida</h1>
            <p className="mb-6 text-sm text-text-secondary">{errorMessage}</p>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  // ── Success ──────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <GlassCard glow className="w-full max-w-md p-0">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-success" />
            <h1 className="mb-2 text-xl font-display font-bold">¡Te has unido!</h1>
            <p className="mb-6 text-sm text-text-secondary">
              {successMessage || 'Bienvenido al evento'}
            </p>
            <Button onClick={() => router.push(`/events/${eventInfo?.id}`)}>
              Ir al evento
            </Button>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  // ── Event Info + Role Selection ──────────────────────────
  if (step === 'event-info') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <GlassCard glow className="w-full max-w-lg p-0">
          <CardContent className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-display font-bold">{eventInfo?.title}</h1>
              <p className="mt-2 text-sm text-text-secondary">
                {eventInfo?.origin} → {eventInfo?.destination}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                {eventInfo?.date
                  ? new Date(eventInfo.date).toLocaleDateString('es', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : ''}
              </p>
            </div>

            <h2 className="mb-4 text-center text-lg font-display font-semibold">
              ¿Cómo quieres unirte?
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleRoleSelect('DRIVER')}
                className="rounded-xl border border-border bg-surface p-6 text-center transition hover:border-primary/40 hover:bg-surface-hover"
              >
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-primary/10 transition group-hover:bg-primary/20">
                  <Car className="size-7 text-primary" />
                </div>
                <h3 className="font-display font-semibold">Conductor</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Ofrece tu vehículo y elige la ruta
                </p>
              </button>
              <button
                onClick={() => handleRoleSelect('PASSENGER')}
                className="rounded-xl border border-border bg-surface p-6 text-center transition hover:border-primary/40 hover:bg-surface-hover"
              >
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-success/10">
                  <User className="size-7 text-success" />
                </div>
                <h3 className="font-display font-semibold">Pasajero</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Solicita un puesto y elige tu punto de encuentro
                </p>
              </button>
            </div>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  // ── Driver Form ──────────────────────────────────────────
  if (step === 'driver-form') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <GlassCard glow className="w-full max-w-lg p-0">
          <CardContent className="p-8">
            <h1 className="mb-1 text-xl font-display font-bold">Unirse como conductor</h1>
            <p className="mb-6 text-sm text-text-secondary">
              {eventInfo?.title} — {eventInfo?.origin} → {eventInfo?.destination}
            </p>

            <form onSubmit={handleDriverJoin} className="space-y-5">
              {/* Vehicle selection */}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Vehículo
                </label>
                {!showNewVehicleForm ? (
                  <div className="space-y-2">
                    <Select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(e.target.value)}
                    >
                      <option value="">Selecciona un vehículo</option>
                      {vehicles?.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.model || v.plate || v.id} ({v.capacity} plazas)
                        </option>
                      ))}
                    </Select>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewVehicleForm(true)}
                    >
                      + Registrar vehículo nuevo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg bg-surface-hover p-4">
                    <Input
                      type="text"
                      value={newVehiclePlate}
                      onChange={(e) => setNewVehiclePlate(e.target.value)}
                      placeholder="Placa (opcional)"
                    />
                    <Input
                      type="text"
                      value={newVehicleModel}
                      onChange={(e) => setNewVehicleModel(e.target.value)}
                      placeholder="Modelo (opcional)"
                    />
                    <div>
                      <label className="mb-1 block text-xs text-text-muted">
                        Capacidad (plazas)
                      </label>
                      <Input
                        type="number"
                        value={newVehicleCapacity}
                        onChange={(e) => setNewVehicleCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        max={20}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      onClick={() => setShowNewVehicleForm(false)}
                    >
                      <ArrowLeft className="size-3.5" />
                      Usar vehículo existente
                    </Button>
                  </div>
                )}
              </div>

              {/* Start location */}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Dirección de salida
                </label>
                <AddressAutocomplete
                  id="startLocation"
                  value={startLocation}
                  onChange={(val) => {
                    setStartLocation(val);
                    setStartLat(null);
                    setStartLng(null);
                  }}
                  onSelect={({ address, lat, lng }) => {
                    setStartLocation(address);
                    setStartLat(lat);
                    setStartLng(lng);
                  }}
                  placeholder="Dirección donde inicias la ruta"
                />
                <p className="mt-1 text-xs text-text-muted">
                  Ingresa la dirección desde donde partirás hacia el evento.
                </p>
              </div>

              {/* Pico y Placa Banner */}
              {picoYPlacaActive && (
                <PicoPlacaBanner active={picoYPlacaActive} message={picoYPlacaMessage} />
              )}

              {/* Error */}
              {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={joinEvent.isPending || createVehicle.isPending}>
                  <Car className="size-4" />
                  {joinEvent.isPending ? 'Uniéndose...' : 'Unirse como conductor'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep('event-info')}>
                  Atrás
                </Button>
              </div>
            </form>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  // ── Passenger Form ───────────────────────────────────────
  if (step === 'passenger-form') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <GlassCard glow className="w-full max-w-lg p-0">
          <CardContent className="p-8">
            <h1 className="mb-1 text-xl font-display font-bold">Unirse como pasajero</h1>
            <p className="mb-6 text-sm text-text-secondary">
              {eventInfo?.title} — {eventInfo?.origin} → {eventInfo?.destination}
            </p>

            <form onSubmit={handlePassengerJoin} className="space-y-5">
              {/* Pickup location */}
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Dirección de recogida *
                </label>
                <AddressAutocomplete
                  id="pickupAddress"
                  value={pickupAddress}
                  onChange={(val) => {
                    setPickupAddress(val);
                    setPickupLat(null);
                    setPickupLng(null);
                  }}
                  onSelect={({ address, lat, lng }) => {
                    setPickupAddress(address);
                    setPickupLat(lat);
                    setPickupLng(lng);
                  }}
                  required
                  placeholder="Ej: Cra 15 # 80-20, Bogotá"
                />
                <p className="mt-1 text-xs text-text-muted">
                  Dirección donde te recogerán. Selecciona una sugerencia para guardar las coordenadas exactas.
                </p>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={joinEvent.isPending}>
                  <User className="size-4" />
                  {joinEvent.isPending ? 'Uniéndose...' : 'Unirse como pasajero'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setStep('event-info')}>
                  Atrás
                </Button>
              </div>
            </form>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  return null;
}
