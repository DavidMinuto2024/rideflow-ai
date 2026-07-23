'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useVehicle,
  useUpdateVehicle,
  useToggleVehicleActive,
  useDeleteVehicle,
} from '@/lib/queries/vehicles';
import { PageContainer, StatusBadge } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';

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

  if (isLoading) return <PageSkeleton />;

  if (error || !vehicle) {
    return (
      <PageContainer title="Vehículo">
        <div className="panel p-8 text-center">
          <p className="text-red-400">Error al cargar el vehículo</p>
          <Link
            href="/vehicles"
            className="mt-4 inline-block text-rideflow-amber hover:underline text-sm"
          >
            ← Volver a vehículos
          </Link>
        </div>
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
        <Link
          href="/vehicles"
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Volver
        </Link>
      }
    >
      {/* Actions bar */}
      <div className="panel p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={vehicle.isActive ? 'ACTIVE' : 'INACTIVE'} />
            <span className="text-sm text-rideflow-muted2">
              {vehicle.capacity} plazas
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleToggleActive}
              disabled={toggleActive.isPending}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-50 ${
                vehicle.isActive
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:brightness-110'
                  : 'bg-green-500/10 text-green-400 border border-green-500/30 hover:brightness-110'
              }`}
            >
              {toggleActive.isPending
                ? '...'
                : vehicle.isActive
                  ? 'Desactivar'
                  : 'Activar'}
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="px-3 py-1.5 bg-rideflow-amber/10 text-rideflow-amber border border-rideflow-amber/30 rounded-lg text-sm font-medium hover:brightness-110 transition"
            >
              {editing ? 'Cancelar' : 'Editar'}
            </button>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-3 py-1.5 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/10 transition"
            >
              Eliminar
            </button>
          </div>
        </div>
        {actionError && (
          <p className="mt-2 text-sm text-red-400">{actionError}</p>
        )}
      </div>

      {/* Edit form */}
      {editing && <EditVehicleForm vehicle={vehicle} onClose={() => setEditing(false)} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="panel p-5 border-red-500/30">
          <p className="text-sm mb-3">
            ¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleteVehicle.isPending}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 text-sm"
            >
              {deleteVehicle.isPending ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="px-4 py-2 border border-rideflow-border rounded-lg text-rideflow-muted hover:text-rideflow-text transition text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="panel p-5">
        <h3 className="font-display font-semibold mb-4">Detalles</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-rideflow-muted">Modelo</p>
            <p className="font-medium">{vehicle.model || '—'}</p>
          </div>
          <div>
            <p className="text-rideflow-muted">Placa</p>
            <p className="font-mono font-medium">{vehicle.plate || '—'}</p>
          </div>
          <div>
            <p className="text-rideflow-muted">Capacidad</p>
            <p className="font-medium">{vehicle.capacity} plazas</p>
          </div>
          <div>
            <p className="text-rideflow-muted">Conductor</p>
            <p className="font-medium">{vehicle.driver?.name ?? 'Sin asignar'}</p>
          </div>
          <div>
            <p className="text-rideflow-muted">Estado</p>
            <p className="font-medium">{vehicle.isActive ? 'Activo' : 'Inactivo'}</p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function EditVehicleForm({
  vehicle,
  onClose,
}: {
  vehicle: {
    id: string;
    model?: string;
    plate?: string;
    capacity: number;
  };
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
    <div className="panel p-5">
      <h3 className="font-display font-semibold mb-4">Editar vehículo</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-rideflow-muted mb-1">
              Modelo
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-rideflow-muted mb-1">
              Placa
            </label>
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber font-mono uppercase"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-rideflow-muted mb-1">
            Capacidad
          </label>
          <input
            type="number"
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={20}
            className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updateVehicle.isPending}
            className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 text-sm"
          >
            {updateVehicle.isPending ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-rideflow-border rounded-lg text-rideflow-muted hover:text-rideflow-text transition text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
