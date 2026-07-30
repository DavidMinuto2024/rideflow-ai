'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Car, Pencil, Trash2, Power } from 'lucide-react';
import {
  useVehicle,
  useUpdateVehicle,
  useToggleVehicleActive,
  useDeleteVehicle,
} from '@/lib/queries/vehicles';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';
import { getRestrictedDays, DAY_NAMES_ES } from '@/lib/utils/pico-placa';

function VehicleSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-20 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

function EditVehicleForm({
  vehicle,
  onClose,
}: {
  vehicle: { id: string; model?: string; plate?: string; capacity: number };
  onClose: () => void;
}) {
  const [model, setModel] = useState(vehicle.model ?? '');
  const [plate, setPlate] = useState(vehicle.plate ?? '');
  const [capacity, setCapacity] = useState(vehicle.capacity);
  const [error, setError] = useState<string | null>(null);
  const updateVehicle = useUpdateVehicle(vehicle.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateVehicle.mutateAsync({
        model: model || undefined,
        plate: plate || undefined,
        capacity,
      });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al actualizar');
      }
    }
  };

  return (
    <Card glass>
      <CardContent className="p-5">
        <h3 className="mb-4 font-display font-semibold">Editar vehículo</h3>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Modelo</label>
              <Input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Placa</label>
              <Input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                className="font-mono uppercase"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Capacidad</label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={20}
            />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={updateVehicle.isPending}>
              {updateVehicle.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: vehicle, isLoading, error } = useVehicle(id);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const toggleActive = useToggleVehicleActive();
  const deleteVehicle = useDeleteVehicle();

  if (isLoading) return <VehicleSkeleton />;

  if (error || !vehicle) {
    return (
      <PageContainer title="Vehículo">
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error al cargar el vehículo</p>
            <div className="mt-4">
              <Link href="/vehicles">
                <Button variant="link">
                  <ArrowLeft className="size-4" />
                  Volver a vehículos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const handleToggleActive = async () => {
    setActionError(null);
    try {
      await toggleActive.mutateAsync(id);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Error al cambiar estado');
      }
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    try {
      await deleteVehicle.mutateAsync(id);
      router.push('/vehicles');
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Error al eliminar');
      }
    }
  };

  return (
    <PageContainer
      title={vehicle.model || vehicle.plate || 'Vehículo'}
      description={vehicle.plate ? `Placa: ${vehicle.plate}` : undefined}
      action={
        <Link href="/vehicles">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </Link>
      }
    >
      {/* Actions bar */}
      <Card glass>
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge variant={vehicle.isActive ? 'success' : 'default'}>
                {vehicle.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
              <span className="text-sm text-text-muted">
                <Car className="mr-1 inline-block size-4" />
                {vehicle.capacity} plazas
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={vehicle.isActive ? 'outline' : 'default'}
                onClick={handleToggleActive}
                disabled={toggleActive.isPending}
              >
                <Power className="size-4" />
                {toggleActive.isPending
                  ? '...'
                  : vehicle.isActive
                    ? 'Desactivar'
                    : 'Activar'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(!editing)}
              >
                <Pencil className="size-4" />
                {editing ? 'Cancelar' : 'Editar'}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            </div>
          </div>
          {actionError && (
            <p className="mt-2 text-sm text-destructive">{actionError}</p>
          )}
        </CardContent>
      </Card>

      {/* Edit form */}
      {editing && <EditVehicleForm vehicle={vehicle} onClose={() => setEditing(false)} />}

      {/* Delete confirm modal */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Eliminar vehículo"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            ¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteVehicle.isPending}
            >
              {deleteVehicle.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details */}
      <Card glass>
        <CardContent className="p-5">
          <h3 className="mb-4 font-display font-semibold">Detalles</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-text-secondary">Modelo</p>
              <p className="font-medium">{vehicle.model || '—'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Placa</p>
              <p className="font-mono font-medium">{vehicle.plate || '—'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Capacidad</p>
              <p className="font-medium">{vehicle.capacity} plazas</p>
            </div>
            <div>
              <p className="text-text-secondary">Conductor</p>
              <p className="font-medium">{vehicle.driver?.name ?? 'Sin asignar'}</p>
            </div>
            <div>
              <p className="text-text-secondary">Estado</p>
              <p className="font-medium">{vehicle.isActive ? 'Activo' : 'Inactivo'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pico y Placa Restriction */}
      {vehicle.plate && (
        <Card glass>
          <CardContent className="p-5">
            <h3 className="mb-3 font-display font-semibold">Restricción Pico y Placa</h3>
            <p className="mb-2 text-sm font-mono text-text-secondary">Placa: {vehicle.plate}</p>
            <div className="flex flex-wrap gap-2">
              {(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const).map((d) => (
                <Badge
                  key={d}
                  variant={getRestrictedDays(vehicle.plate).includes(d) ? 'warning' : 'default'}
                  className="text-xs px-2 py-1"
                >
                  {DAY_NAMES_ES[d][0]}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Días resaltados en ámbar = restricción activa según último dígito de placa (Bogotá L-V)
            </p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
