'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganizations } from '@/lib/queries/organizations';
import { useCreateEvent } from '@/lib/queries/events';
import { PageContainer } from '@/components/PageContainer';
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
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
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
        destination,
        capacity,
        description: description || undefined,
      });
      router.push(`/events`);
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
      <div className="panel p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Organization selector */}
          <div>
            <label className="block text-sm font-medium text-rideflow-muted mb-1">
              Organización
            </label>
            {orgsLoading ? (
              <div className="h-10 bg-rideflow-panel2 rounded-lg animate-pulse" />
            ) : (
              <select
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
              >
                <option value="">Selecciona una organización</option>
                {orgs?.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-rideflow-muted mb-1">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
              placeholder="Viaje a la oficina"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                min={today}
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Hora
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Origen
              </label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
                placeholder="Dirección de salida"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Destino
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
                placeholder="Dirección de llegada"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Capacidad (plazas)
              </label>
              <input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={20}
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-rideflow-muted mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber resize-none"
              placeholder="Detalles adicionales del viaje..."
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createEvent.isPending || !orgId}
              className="px-6 py-2.5 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createEvent.isPending ? 'Creando...' : 'Crear evento'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-rideflow-border rounded-lg text-rideflow-muted hover:text-rideflow-text transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </PageContainer>
  );
}
