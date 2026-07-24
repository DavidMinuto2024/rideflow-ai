'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Car } from 'lucide-react';
import { useOrganizations } from '@/lib/queries/organizations';
import { useCreateVehicle } from '@/lib/queries/vehicles';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
      <Card className="max-w-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Organización
              </label>
              <Select
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Modelo
                </label>
                <Input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Toyota Corolla"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Placa
                </label>
                <Input
                  type="text"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="ABC-123"
                  className="font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Capacidad (plazas)
              </label>
              <Input
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={20}
              />
              <p className="mt-1 text-xs text-text-muted">Máximo 20 plazas</p>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={createVehicle.isPending || !orgId}
              >
                <Car className="size-4" />
                {createVehicle.isPending ? 'Creando...' : 'Crear vehículo'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
