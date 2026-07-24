'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Car, Plus, Filter } from 'lucide-react';
import { useOrganizations } from '@/lib/queries/organizations';
import { useVehicles } from '@/lib/queries/vehicles';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

function VehiclesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="size-10 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function VehiclesPage() {
  const { data: orgs } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);

  const effectiveOrgId = selectedOrg || orgs?.[0]?.id || '';
  const { data: vehicles, isLoading } = useVehicles(effectiveOrgId, showInactive);

  return (
    <PageContainer
      title="Vehículos"
      description="Registro de vehículos por organización"
      action={
        <Link href={`/vehicles/new${effectiveOrgId ? `?orgId=${effectiveOrgId}` : ''}`}>
          <Button size="sm">
            <Plus className="size-4" />
            Nuevo
          </Button>
        </Link>
      }
    >
      {/* Filters */}
      {orgs && orgs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {orgs.length > 1 &&
            orgs.map((org) => (
              <Button
                key={org.id}
                size="sm"
                variant={(selectedOrg || orgs[0]?.id) === org.id ? 'default' : 'outline'}
                onClick={() => setSelectedOrg(org.id)}
              >
                <Filter className="size-3.5" />
                {org.name}
              </Button>
            ))}
          <label className="ml-auto flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded border-border bg-surface-hover accent-primary"
            />
            Mostrar inactivos
          </label>
        </div>
      )}

      {!effectiveOrgId ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Car className="mx-auto mb-3 size-10 text-text-muted" />
            <h3 className="mb-1 font-display font-semibold">Selecciona una organización</h3>
            <p className="text-sm text-text-secondary">
              Necesitas pertenecer a una organización para ver sus vehículos.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <VehiclesSkeleton />
      ) : !vehicles || vehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Car className="mx-auto mb-3 size-10 text-text-muted" />
            <h3 className="mb-1 font-display font-semibold">Sin vehículos</h3>
            <p className="mb-4 text-sm text-text-secondary">
              No hay vehículos registrados en esta organización.
            </p>
            <Link href={`/vehicles/new?orgId=${effectiveOrgId}`}>
              <Button>
                <Plus className="size-4" />
                Nuevo vehículo
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Link key={v.id} href={`/vehicles/${v.id}`}>
              <Card className="h-full transition hover:ring-2 hover:ring-primary/40">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                      <Car className="size-5 text-primary" />
                    </div>
                    <Badge variant={v.isActive ? 'success' : 'default'}>
                      {v.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <h3 className="font-display font-semibold">
                    {v.model || 'Vehículo'}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm">
                    {v.plate && (
                      <p className="font-mono text-text-muted">{v.plate}</p>
                    )}
                    <p className="text-text-secondary">{v.capacity} plazas</p>
                    {v.driver && (
                      <p className="text-text-muted">Conductor: {v.driver.name}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
