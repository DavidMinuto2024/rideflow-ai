'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useOrganizations } from '@/lib/queries/organizations';
import { useCreateEvent } from '@/lib/queries/events';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

export default function NewEventPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrgId = searchParams.get('orgId') ?? '';
  const { data: orgs, isLoading: orgsLoading } = useOrganizations();

  const [orgId, setOrgId] = useState(preselectedOrgId);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [origin, setOrigin] = useState('');
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);
  const [destination, setDestination] = useState('');
  const [destLat, setDestLat] = useState<number | null>(null);
  const [destLng, setDestLng] = useState<number | null>(null);
  const [capacity, setCapacity] = useState(4);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createEvent = useCreateEvent(orgId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setError('Selecciona una organización');
      return;
    }
    setError(null);

    const eventDate = time ? `${date}T${time}:00` : `${date}T00:00:00`;

    try {
      await createEvent.mutateAsync({
        title,
        date: eventDate,
        origin,
        originLat: originLat ?? undefined,
        originLng: originLng ?? undefined,
        destination,
        destLat: destLat ?? undefined,
        destLng: destLng ?? undefined,
        capacity,
        description: description || undefined,
        arrivalTime: new Date(arrivalTime).toISOString(),
      });
      router.push('/events');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al crear el evento');
      }
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <PageContainer
      title="Nuevo evento"
      description="Crea un evento de carpooling"
    >
      <Card glass className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Organization selector */}
            <FormField label="Organización" id="orgId">
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

            <FormField label="Título" id="title">
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Viaje a la oficina"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Fecha" id="date">
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  min={today}
                />
              </FormField>
              <FormField label="Hora" id="time">
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Hora de llegada" id="arrivalTime" required>
              <Input
                id="arrivalTime"
                type="datetime-local"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Origen (dirección de salida)" id="origin">
              <AddressAutocomplete
                id="origin"
                value={origin}
                onChange={setOrigin}
                onSelect={({ address, lat, lng }) => {
                  setOrigin(address);
                  setOriginLat(lat);
                  setOriginLng(lng);
                }}
                placeholder="Dirección desde donde salen"
              />
            </FormField>

            <FormField label="Destino" id="destination">
              <AddressAutocomplete
                id="destination"
                value={destination}
                onChange={(val) => {
                  setDestination(val);
                  // Clear coords if user edits manually without selecting
                  setDestLat(null);
                  setDestLng(null);
                }}
                onSelect={({ address, lat, lng }) => {
                  setDestination(address);
                  setDestLat(lat);
                  setDestLng(lng);
                }}
                required
                placeholder="Dirección de llegada"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Capacidad (plazas)" id="capacity">
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
                rows={3}
                className="flex w-full rounded-md border bg-surface px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                placeholder="Detalles adicionales del viaje..."
              />
            </FormField>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5"
              >
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                loading={createEvent.isPending}
                disabled={!orgId}
              >
                Crear evento
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
    </PageContainer>
  );
}
