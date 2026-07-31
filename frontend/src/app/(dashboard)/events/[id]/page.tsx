'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Car, ClipboardList, Pencil, QrCode, SendHorizonal, Sparkles, Share2, Copy, Check } from 'lucide-react';
import { DriverSuggestionsModal } from '@/components/trips/DriverSuggestionsModal';
import {
  useEvent,
  useUpdateEvent,
  useUpdateEventStatus,
  canTransitionFrom,
  type EventStatus,
} from '@/lib/queries/events';
import { useSession } from '@/lib/queries/auth';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import { ApiError } from '@/lib/api';
import { buildWazeDeepLink, buildGoogleMapsDeepLink } from '@/lib/maps';
import { AddressAutocomplete } from '@/components/ui/AddressAutocomplete';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
});

const STATUS_ACTIONS: Record<EventStatus, EventStatus> = {
  DRAFT: 'PUBLISHED',
  PUBLISHED: 'OPEN',
  OPEN: 'CLOSED',
  CLOSED: 'FINISHED',
  FINISHED: null as unknown as EventStatus,
};

function statusToBadge(
  status: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (status) {
    case 'DRAFT':
      return 'outline';
    case 'PUBLISHED':
      return 'info';
    case 'OPEN':
      return 'success';
    case 'CLOSED':
      return 'warning';
    case 'FINISHED':
      return 'default';
    default:
      return 'outline';
  }
}

const ALLOWED_EDIT_ROLES = ['ORG_ADMIN', 'DRIVER', 'SUPER_ADMIN'];
const EDITABLE_STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED'];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: event, isLoading, error } = useEvent(id);
  const { data: session } = useSession();
  const updateStatus = useUpdateEventStatus(id);
  const updateEvent = useUpdateEvent(id);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editArrivalTime, setEditArrivalTime] = useState('');
  const [editOrigin, setEditOrigin] = useState('');
  const [editOriginLat, setEditOriginLat] = useState<number | null>(null);
  const [editOriginLng, setEditOriginLng] = useState<number | null>(null);
  const [editDestination, setEditDestination] = useState('');
  const [editDestLat, setEditDestLat] = useState<number | null>(null);
  const [editDestLng, setEditDestLng] = useState<number | null>(null);
  const [editCapacity, setEditCapacity] = useState(4);
  const [editDescription, setEditDescription] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const canEdit =
    event &&
    EDITABLE_STATUSES.includes(event.status) &&
    session?.memberships?.some(
      (m) =>
        m.organization.id === event.organizationId &&
        ALLOWED_EDIT_ROLES.includes(m.role),
    );

  const openEditModal = () => {
    if (!event) return;
    setEditTitle(event.title);
    setEditDate(event.date.split('T')[0]);
    setEditTime(event.date.includes('T') ? event.date.split('T')[1].substring(0, 5) : '');
    setEditArrivalTime(event.arrivalTime ? event.arrivalTime.substring(0, 16) : '');
    setEditOrigin(event.origin ?? '');
    setEditOriginLat(event.originLat ?? null);
    setEditOriginLng(event.originLng ?? null);
    setEditDestination(event.destination);
    setEditDestLat(event.destLat ?? null);
    setEditDestLng(event.destLng ?? null);
    setEditCapacity(event.capacity);
    setEditDescription(event.description ?? '');
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const eventDate = editTime ? new Date(`${editDate}T${editTime}:00`).toISOString() : new Date(`${editDate}T00:00:00`).toISOString();
    try {
      await updateEvent.mutateAsync({
        title: editTitle,
        date: eventDate,
        origin: editOrigin,
        originLat: editOriginLat ?? undefined,
        originLng: editOriginLng ?? undefined,
        destination: editDestination,
        destLat: editDestLat ?? undefined,
        destLng: editDestLng ?? undefined,
        capacity: editCapacity,
        description: editDescription || undefined,
        arrivalTime: editArrivalTime ? new Date(editArrivalTime).toISOString() : undefined,
      });
      setEditOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setEditError(err.message);
      } else {
        setEditError('Error al guardar cambios');
      }
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Evento">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (error || !event) {
    return (
      <PageContainer title="Evento">
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error al cargar el evento</p>
            <div className="mt-4">
              <Link href="/events">
                <Button variant="link">
                  <ArrowLeft className="size-4" />
                  Volver a eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const nextStatus = STATUS_ACTIONS[event.status];
  const possibleTransitions = canTransitionFrom(event.status);

  const handleStatusChange = async (newStatus: EventStatus) => {
    setActionError(null);
    try {
      await updateStatus.mutateAsync(newStatus);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Error al cambiar estado');
      }
    }
  };

  const originLat = event?.originLat ?? event?.origin_lat;
  const originLng = event?.originLng ?? event?.origin_lng;
  const destLat = event?.destLat ?? event?.dest_lat;
  const destLng = event?.destLng ?? event?.dest_lng;

  const hasCoords = Boolean(
    (originLat != null && originLng != null) ||
      (destLat != null && destLng != null),
  );

  const vehicleWaypoints = (event?.eventVehicles ?? []).reduce<
    Array<{ lat: number; lng: number; label: string; color: string }>
  >((acc, ev) => {
    const lat = ev.startLat ?? ev.start_lat;
    const lng = ev.startLng ?? ev.start_lng;
    if (lat != null && lng != null) {
      acc.push({
        lat,
        lng,
        label: `Salida: ${ev.driver?.name || 'Conductor'} (${ev.startLocation || 'Origen'})`,
        color: '#22c55e',
      });
    }
    return acc;
  }, []);

  const inviteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/invite/${event.inviteToken}`
    : `https://rideflow-ai.vercel.app/invite/${event.inviteToken}`;

  const handleCopyInviteUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <PageContainer
      title={event.title}
      description={`${event.origin || 'Origen sin definir'} → ${event.destination}`}
      action={
        <Link href="/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </Link>
      }
    >
      {/* Status + Actions */}
      <Card glass>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <Badge variant={statusToBadge(event.status)}>{event.status}</Badge>
            <span className="text-sm text-text-muted">{event.capacity} plazas</span>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={openEditModal}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
            )}
            {possibleTransitions.map((status) => (
              <Button
                key={status}
                size="sm"
                onClick={() => handleStatusChange(status)}
                loading={updateStatus.isPending}
              >
                → {status}
              </Button>
            ))}
          </div>
        </CardContent>
        {actionError && (
          <div className="px-5 pb-4">
            <p className="text-sm text-destructive">{actionError}</p>
          </div>
        )}
      </Card>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/events/${id}/trips`}>
          <Button variant="outline" size="sm">
            <Car className="size-4" />
            Viajes
          </Button>
        </Link>
        <Link href={`/events/${id}/requests`}>
          <Button variant="outline" size="sm">
            <ClipboardList className="size-4" />
            Solicitudes
          </Button>
        </Link>
        {event.status === 'OPEN' && (
          <Link href={`/events/${id}/request`}>
            <Button size="sm">
              <SendHorizonal className="size-4" />
              Solicitar viaje
            </Button>
          </Link>
        )}
        {event.inviteToken && (
          <Link href={`/events/${id}/qr`}>
            <Button variant="outline" size="sm">
              <QrCode className="size-4" />
              QR Invitación
            </Button>
          </Link>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSuggestionsOpen(true)}
        >
          <Sparkles className="size-4 text-primary" />
          Sugerencias
        </Button>
      </div>

      {/* Shareable Invite URL Banner */}
      {event.inviteToken && (
        <Card glass className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-display font-semibold text-sm flex items-center gap-2 text-primary">
                <Share2 className="size-4" />
                Enlace para compartir e invitar personas
              </p>
              <p className="text-xs text-text-secondary">
                Copia este enlace para enviarlo por WhatsApp o correo. Permite que conductores añadan sus autos o pasajeros pidan cupo.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                readOnly
                value={inviteUrl}
                className="text-xs font-mono min-w-[220px] max-w-full bg-surface"
              />
              <Button size="sm" onClick={handleCopyInviteUrl} className="shrink-0">
                {copied ? (
                  <>
                    <Check className="size-4" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <DriverSuggestionsModal
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        eventId={id}
      />

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <Card glass>
            <CardContent className="p-5">
              <h3 className="mb-4 font-display font-semibold">Detalles</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-secondary">Fecha</p>
                  <p className="font-medium">
                    {new Date(event.date).toLocaleDateString('es', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Conductor</p>
                  <p className="font-medium">
                    {event.driver?.name ?? 'Sin asignar'}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Origen</p>
                  <p className="font-medium">{event.origin}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Destino</p>
                  <p className="font-medium">{event.destination}</p>
                </div>
                {event.arrivalTime && (
                  <div>
                    <p className="text-text-secondary">Hora de llegada</p>
                    <p className="font-medium">
                      {new Date(event.arrivalTime).toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                {event.vehicle && (
                  <div>
                    <p className="text-text-secondary">Vehículo</p>
                    <p className="font-medium">
                      {event.vehicle.model || event.vehicle.plate || '—'}
                    </p>
                  </div>
                )}
              </div>
              {event.description && (
                <div className="mt-4">
                  <p className="text-sm text-text-secondary">Descripción</p>
                  <p className="mt-1 text-sm">{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EventVehicles registered */}
          {event.eventVehicles && event.eventVehicles.length > 0 && (
            <Card glass>
              <CardContent className="p-5">
                <h3 className="mb-3 font-display font-semibold">
                  Vehículos registrados ({event.eventVehicles.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {event.eventVehicles.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {ev.vehicle?.model || ev.vehicle?.plate || 'Vehículo'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          Conductor: {ev.driver?.name || '—'}
                          {ev.startLocation && ` · Salida: ${ev.startLocation}`}
                        </p>
                      </div>
                      {ev.picoYPlaca && (
                        <span className="whitespace-nowrap text-xs font-medium text-destructive">
                          Pico y placa
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div>
          {hasCoords || vehicleWaypoints.length > 0 ? (
            <Card glass className="overflow-hidden">
              <MapView
                originLat={originLat}
                originLng={originLng}
                destLat={destLat}
                destLng={destLng}
                originLabel={event.origin}
                destLabel={event.destination}
                waypoints={vehicleWaypoints}
                zoom={14}
              />
            </Card>
          ) : (
            <Card glass>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-text-secondary">
                  No hay coordenadas disponibles para mostrar en el mapa.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {/* Edit Event Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar evento">
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          <FormField label="Título" id="edit-title">
            <Input
              id="edit-title"
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fecha" id="edit-date">
              <Input
                id="edit-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Hora" id="edit-time">
              <Input
                id="edit-time"
                type="time"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Hora de llegada" id="edit-arrivalTime" required>
            <Input
              id="edit-arrivalTime"
              type="datetime-local"
              value={editArrivalTime}
              onChange={(e) => setEditArrivalTime(e.target.value)}
              required
            />
          </FormField>

          <FormField label="Origen" id="edit-origin">
            <AddressAutocomplete
              id="edit-origin"
              value={editOrigin}
              onChange={(val) => {
                setEditOrigin(val);
                setEditOriginLat(null);
                setEditOriginLng(null);
              }}
              onSelect={({ address, lat, lng }) => {
                setEditOrigin(address);
                setEditOriginLat(lat);
                setEditOriginLng(lng);
              }}
              placeholder="Dirección de salida"
            />
          </FormField>

          <FormField label="Destino" id="edit-destination" required>
            <AddressAutocomplete
              id="edit-destination"
              value={editDestination}
              onChange={(val) => {
                setEditDestination(val);
                setEditDestLat(null);
                setEditDestLng(null);
              }}
              onSelect={({ address, lat, lng }) => {
                setEditDestination(address);
                setEditDestLat(lat);
                setEditDestLng(lng);
              }}
              required
              placeholder="Dirección de llegada"
            />
          </FormField>

          <FormField label="Capacidad (plazas)" id="edit-capacity">
            <Input
              id="edit-capacity"
              type="number"
              value={editCapacity}
              onChange={(e) => setEditCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={20}
            />
          </FormField>

          <FormField label="Descripción (opcional)" id="edit-description">
            <textarea
              id="edit-description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border bg-surface px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
              placeholder="Detalles adicionales..."
            />
          </FormField>

          {editError && (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
              <p className="text-sm text-destructive">{editError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={updateEvent.isPending}>
              Guardar
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
}
