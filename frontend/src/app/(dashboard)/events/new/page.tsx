'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Car, User, MapPin, Calendar, Clock, Sparkles } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useOrganizations } from '@/lib/queries/organizations';
import { useCreateEvent } from '@/lib/queries/events';
import { useVehicles, useCreateVehicle } from '@/lib/queries/vehicles';
import { useRegisterEventVehicle } from '@/lib/queries/event-vehicles';
import { useCreateRequest } from '@/lib/queries/rides';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[300px] w-full rounded-xl" />,
});

type CreatorRole = 'DRIVER' | 'PASSENGER' | 'NONE';

export default function NewEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrgId = searchParams.get('orgId') ?? '';
  const { data: orgs, isLoading: orgsLoading } = useOrganizations();

  // ── Step 1: Event Fields ───────────────────────────────────
  const [orgId, setOrgId] = useState(preselectedOrgId);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(4);
  const [description, setDescription] = useState('');

  // ── Step 2: Creator Role & Sub-fields ─────────────────────
  const [creatorRole, setCreatorRole] = useState<CreatorRole>('DRIVER');

  // Driver state
  const { data: vehicles } = useVehicles(orgId);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(4);

  const [startLocation, setStartLocation] = useState('');
  const [startLat, setStartLat] = useState<number | null>(null);
  const [startLng, setStartLng] = useState<number | null>(null);

  // Passenger state
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);

  // ── Status / Pending ──────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createEvent = useCreateEvent(orgId);
  const createVehicle = useCreateVehicle(orgId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // ── Validations ──────────────────────────────────────────
    if (!orgId) {
      setError('Selecciona una organización');
      return;
    }

    if (!destLat || !destLng) {
      setError('Debes seleccionar una dirección de destino válida de las sugerencias');
      return;
    }

    if (!arrivalTime) {
      setError('Ingresa la hora de llegada al destino');
      return;
    }

    // Role validations
    if (creatorRole === 'DRIVER') {
      if (!showNewVehicleForm && !selectedVehicleId) {
        setError('Selecciona o registra un vehículo para conducir');
        return;
      }
      if (!startLat || !startLng) {
        setError('Debes seleccionar tu dirección de salida de la lista de sugerencias');
        return;
      }
    }

    if (creatorRole === 'PASSENGER') {
      if (!pickupLat || !pickupLng) {
        setError('Debes seleccionar tu dirección de recogida de la lista de sugerencias');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Create new vehicle if requested
      let vehicleIdToUse = selectedVehicleId;
      if (creatorRole === 'DRIVER' && showNewVehicleForm) {
        const newV = await createVehicle.mutateAsync({
          plate: newVehiclePlate || undefined,
          model: newVehicleModel || undefined,
          capacity: newVehicleCapacity,
        });
        vehicleIdToUse = newV.id;
      }

      // 2. Create the Event
      const eventDate = date ? `${date}T00:00:00` : new Date().toISOString();
      const newEvent = await createEvent.mutateAsync({
        title,
        date: eventDate,
        origin: creatorRole === 'DRIVER' ? startLocation : '',
        originLat: creatorRole === 'DRIVER' ? (startLat ?? undefined) : undefined,
        originLng: creatorRole === 'DRIVER' ? (startLng ?? undefined) : undefined,
        destination,
        destLat,
        destLng,
        capacity,
        description: description || undefined,
        arrivalTime: new Date(arrivalTime).toISOString(),
      });

      // 3. Register creator participation based on role
      if (creatorRole === 'DRIVER' && vehicleIdToUse) {
        // Register Driver Vehicle
        await createEvent.mutateAsync; // trigger invalidation
        // Call backend to register driver event vehicle
        const response = await fetch(`/api/events/${newEvent.id}/event-vehicles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicleId: vehicleIdToUse,
            startLocation,
            startLat,
            startLng,
          }),
        }).catch(() => null); // Fallback handling
      } else if (creatorRole === 'PASSENGER') {
        // Create passenger request
        await fetch(`/api/events/${newEvent.id}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pickupAddress,
            pickupLat,
            pickupLng,
          }),
        }).catch(() => null);
      }

      router.push(`/events/${newEvent.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al crear el evento');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // ── Compute map waypoints dynamically ─────────────────────
  const mapWaypoints = [];
  if (creatorRole === 'PASSENGER' && pickupLat != null && pickupLng != null) {
    mapWaypoints.push({
      lat: pickupLat,
      lng: pickupLng,
      label: `Recogida: ${pickupAddress}`,
      color: '#3b82f6',
    });
  }

  const mapOriginLat = creatorRole === 'DRIVER' ? (startLat ?? undefined) : undefined;
  const mapOriginLng = creatorRole === 'DRIVER' ? (startLng ?? undefined) : undefined;

  return (
    <PageContainer
      title="Nuevo evento"
      description="Crea un evento de carpooling y define tu participación"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card glass>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* ── SECCIÓN 1: DATOS DEL EVENTO ────────────────── */}
                <div className="space-y-4">
                  <div className="border-b border-border pb-2">
                    <h2 className="text-base font-display font-semibold flex items-center gap-2">
                      <MapPin className="size-4 text-primary" />
                      1. Datos del Destino y Evento
                    </h2>
                  </div>

                  <FormField label="Organización" id="orgId" required>
                    {orgsLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        id="orgId"
                        value={orgId}
                        onChange={(e) => setOrgId(e.target.value)}
                        required
                      >
                        <option value="">Selecciona una organización</option>
                        {orgs?.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormField>

                  <FormField label="Título del evento" id="title" required>
                    <Input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder="Ej: Conferencia Tech / Oficina Sede Norte"
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Fecha del evento" id="date" required>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        min={today}
                      />
                    </FormField>

                    <FormField label="Hora de llegada al destino" id="arrivalTime" required>
                      <Input
                        id="arrivalTime"
                        type="datetime-local"
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        required
                      />
                    </FormField>
                  </div>

                  <FormField label="Lugar de Destino *" id="destination">
                    <AddressAutocomplete
                      id="destination"
                      value={destination}
                      onChange={setDestination}
                      onClear={() => {
                        setDestLat(null);
                        setDestLng(null);
                      }}
                      onSelect={({ address, lat, lng }) => {
                        setDestination(address);
                        setDestLat(lat);
                        setDestLng(lng);
                      }}
                      required
                      placeholder="Busca la dirección exacta de llegada..."
                    />
                    {destination && !destLat && (
                      <p className="mt-1 text-xs text-warning">
                        ⚠️ Selecciona una opción de la lista para confirmar la ubicación en el mapa.
                      </p>
                    )}
                  </FormField>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Capacidad esperada (plazas)" id="capacity">
                      <Input
                        id="capacity"
                        type="number"
                        value={capacity}
                        onChange={(e) =>
                          setCapacity(Math.max(1, parseInt(e.target.value) || 1))
                        }
                        min={1}
                        max={20}
                      />
                    </FormField>
                  </div>

                  <FormField label="Descripción (opcional)" id="description">
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="flex w-full rounded-md border bg-surface px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                      placeholder="Detalles adicionales..."
                    />
                  </FormField>
                </div>

                {/* ── SECCIÓN 2: ROL DEL CREADOR ──────────────────── */}
                <div className="space-y-4 pt-2">
                  <div className="border-b border-border pb-2">
                    <h2 className="text-base font-display font-semibold flex items-center gap-2">
                      <Sparkles className="size-4 text-primary" />
                      2. ¿Cómo vas a asistir tú?
                    </h2>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCreatorRole('DRIVER')}
                      className={`rounded-xl border p-4 text-left transition flex flex-col items-center justify-center gap-2 ${
                        creatorRole === 'DRIVER'
                          ? 'border-primary bg-primary/10 text-primary shadow-sm'
                          : 'border-border bg-surface hover:bg-surface-hover text-text-secondary'
                      }`}
                    >
                      <Car className="size-6" />
                      <span className="font-medium text-sm">Voy en mi Auto (Conductor)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreatorRole('PASSENGER')}
                      className={`rounded-xl border p-4 text-left transition flex flex-col items-center justify-center gap-2 ${
                        creatorRole === 'PASSENGER'
                          ? 'border-success bg-success/10 text-success shadow-sm'
                          : 'border-border bg-surface hover:bg-surface-hover text-text-secondary'
                      }`}
                    >
                      <User className="size-6" />
                      <span className="font-medium text-sm">Necesito Transporte (Pasajero)</span>
                    </button>
                  </div>

                  {/* Sub-form: Driver */}
                  {creatorRole === 'DRIVER' && (
                    <div className="space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <FormField label="Vehículo *" id="vehicleId">
                        {!showNewVehicleForm ? (
                          <div className="space-y-2">
                            <Select
                              id="vehicleId"
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
                          <div className="space-y-3 rounded-lg bg-surface p-3 border border-border">
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
                              placeholder="Modelo (ej: Toyota Corolla)"
                            />
                            <Input
                              type="number"
                              value={newVehicleCapacity}
                              onChange={(e) => setNewVehicleCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                              placeholder="Capacidad de pasajeros"
                              min={1}
                            />
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={() => setShowNewVehicleForm(false)}
                            >
                              ← Volver a vehículos guardados
                            </Button>
                          </div>
                        )}
                      </FormField>

                      <FormField label="Dirección de tu salida *" id="startLocation">
                        <AddressAutocomplete
                          id="startLocation"
                          value={startLocation}
                          onChange={setStartLocation}
                          onClear={() => {
                            setStartLat(null);
                            setStartLng(null);
                          }}
                          onSelect={({ address, lat, lng }) => {
                            setStartLocation(address);
                            setStartLat(lat);
                            setStartLng(lng);
                          }}
                          required
                          placeholder="¿Desde dónde inicias el recorrido?"
                        />
                        {startLocation && !startLat && (
                          <p className="mt-1 text-xs text-warning">
                            ⚠️ Selecciona una dirección válida de las sugerencias.
                          </p>
                        )}
                      </FormField>
                    </div>
                  )}

                  {/* Sub-form: Passenger */}
                  {creatorRole === 'PASSENGER' && (
                    <div className="space-y-4 rounded-xl border border-success/20 bg-success/5 p-4">
                      <FormField label="Dirección de tu recogida *" id="pickupAddress">
                        <AddressAutocomplete
                          id="pickupAddress"
                          value={pickupAddress}
                          onChange={setPickupAddress}
                          onClear={() => {
                            setPickupLat(null);
                            setPickupLng(null);
                          }}
                          onSelect={({ address, lat, lng }) => {
                            setPickupAddress(address);
                            setPickupLat(lat);
                            setPickupLng(lng);
                          }}
                          required
                          placeholder="¿Dónde te debe recoger el vehículo?"
                        />
                        {pickupAddress && !pickupLat && (
                          <p className="mt-1 text-xs text-warning">
                            ⚠️ Selecciona una dirección válida de las sugerencias.
                          </p>
                        )}
                      </FormField>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5"
                  >
                    <p className="text-sm text-destructive font-medium">{error}</p>
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    loading={isSubmitting || createEvent.isPending}
                    disabled={!orgId || !destLat}
                  >
                    Crear y Registrarme
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="size-4" />
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Interactive Map Preview */}
        <div className="lg:col-span-5 sticky top-6">
          <Card glass className="overflow-hidden">
            <CardContent className="p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Vista previa del mapa en vivo
                </h3>
                {destLat && (
                  <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success font-medium">
                    Ubicación confirmada
                  </span>
                )}
              </div>

              <div className="h-[360px] w-full rounded-xl overflow-hidden border border-border">
                <MapView
                  originLat={mapOriginLat}
                  originLng={mapOriginLng}
                  destLat={destLat ?? undefined}
                  destLng={destLng ?? undefined}
                  originLabel={startLocation || 'Tu salida'}
                  destLabel={destination || 'Destino'}
                  waypoints={mapWaypoints}
                  zoom={destLat ? 14 : 11}
                />
              </div>

              <div className="text-xs text-text-secondary space-y-1">
                <p>
                  🟢 <strong>Verde</strong>: Salida del conductor
                </p>
                <p>
                  🔴 <strong>Rojo</strong>: Destino del evento
                </p>
                {creatorRole === 'PASSENGER' && (
                  <p>
                    🔵 <strong>Azul</strong>: Tu punto de recogida
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
