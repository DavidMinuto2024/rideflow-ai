'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrganizations } from '@/lib/queries/organizations';
import { useCreateVehicle } from '@/lib/queries/vehicles';
import { PageContainer } from '@/components/PageContainer';
import { ApiError } from '@/lib/api';

export default function NewVehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedOrgId = searchParams.get('orgId') ?? '';
  const { data: orgs } = useOrganizations();

  const [orgId, setOrgId] = useState(preselectedOrgId);
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [error, setError] = useState<string | null>(null);

  const createVehicle = useCreateVehicle(orgId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) {
      setError('Selecciona una organización');
      return;
    }
    setError(null);

    try {
      await createVehicle.mutateAsync({
        model: model || undefined,
        plate: plate || undefined,
        capacity,
      });
      router.push(`/vehicles`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al crear el vehículo');
      }
    }
  };

  return (
    <PageContainer
      title="Nuevo vehículo"
      description="Registra un vehículo en una organización"
    >
      <div className="panel p-6 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-rideflow-muted mb-1">
              Organización
            </label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
                placeholder="Toyota Corolla"
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
                className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber font-mono uppercase"
                placeholder="ABC-123"
              />
            </div>
          </div>

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
            <p className="text-xs text-rideflow-muted2 mt-1">Máximo 20 plazas</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createVehicle.isPending || !orgId}
              className="px-6 py-2.5 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createVehicle.isPending ? 'Creando...' : 'Crear vehículo'}
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
