'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrganizations } from '@/lib/queries/organizations';
import { useVehicles } from '@/lib/queries/vehicles';
import { PageContainer, StatusBadge, EmptyState } from '@/components/PageContainer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

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
        <Link
          href={`/vehicles/new${effectiveOrgId ? `?orgId=${effectiveOrgId}` : ''}`}
          className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
        >
          Nuevo vehículo
        </Link>
      }
    >
      {/* Filters */}
      {orgs && orgs.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {orgs.length > 1 &&
            orgs.map((org) => (
              <button
                key={org.id}
                onClick={() => setSelectedOrg(org.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  (selectedOrg || orgs[0]?.id) === org.id
                    ? 'bg-rideflow-amber/10 text-rideflow-amber border border-rideflow-amber/30'
                    : 'bg-rideflow-panel text-rideflow-muted border border-rideflow-border hover:text-rideflow-text'
                }`}
              >
                {org.name}
              </button>
            ))}
          <label className="flex items-center gap-2 text-sm text-rideflow-muted ml-auto">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded bg-rideflow-panel2 border-rideflow-border"
            />
            Mostrar inactivos
          </label>
        </div>
      )}

      {!effectiveOrgId ? (
        <EmptyState
          title="Selecciona una organización"
          description="Necesitas pertenecer a una organización para ver sus vehículos."
        />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : !vehicles || vehicles.length === 0 ? (
        <EmptyState
          title="Sin vehículos"
          description="No hay vehículos registrados en esta organización."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <Link
              key={v.id}
              href={`/vehicles/${v.id}`}
              className="panel p-5 hover:border-rideflow-amber/50 transition group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-rideflow-amber/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-rideflow-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                </div>
                <StatusBadge status={v.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <h3 className="font-display font-semibold group-hover:text-rideflow-amber transition">
                {v.model || 'Vehículo'}
              </h3>
              <div className="mt-2 text-sm space-y-1">
                {v.plate && (
                  <p className="text-rideflow-muted2 font-mono">{v.plate}</p>
                )}
                <p className="text-rideflow-muted">{v.capacity} plazas</p>
                {v.driver && (
                  <p className="text-rideflow-muted2">Conductor: {v.driver.name}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
