'use client';

import { useAuth } from '@/lib/auth-context';
import { useSession } from '@/lib/queries/auth';
import { useDashboardStats } from '@/lib/queries/dashboard';
import { PageContainer, EmptyState, StatusBadge } from '@/components/PageContainer';
import { PageSkeleton, LoadingSpinner } from '@/components/LoadingSpinner';
import Link from 'next/link';
import { ApiError } from '@/lib/api';

const statCards = [
  {
    key: 'activeEvents',
    label: 'Eventos Activos',
    color: 'text-rideflow-amber',
    bg: 'bg-rideflow-amber/10',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    format: (v: number) => v,
  },
  {
    key: 'totalParticipants',
    label: 'Total Participantes',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    format: (v: number) => v,
  },
  {
    key: 'tripsToday',
    label: 'Viajes Hoy',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
    format: (v: number) => v,
  },
  {
    key: 'pendingRequests',
    label: 'Solicitudes Pendientes',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    format: (v: number) => v,
  },
  {
    key: 'vehicleUtilization',
    label: 'Uso de Vehículos',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    format: (v: number) => `${Math.round(v * 100)}%`,
  },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch,
  } = useDashboardStats();

  if (sessionLoading || statsLoading) return <PageSkeleton />;

  const memberships = sessionData?.memberships ?? [];

  return (
    <PageContainer
      title="Dashboard"
      description="Bienvenido de nuevo, resume tus organizaciones y actividad."
    >
      {/* Stats error banner */}
      {statsError && (
        <div className="panel p-4 border border-red-500/30 bg-red-500/5 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-400">
            {statsError instanceof ApiError
              ? statsError.message
              : 'Error al cargar estadísticas'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 text-sm bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:brightness-110 transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const value = stats?.[card.key as keyof typeof stats];
          return (
            <div key={card.key} className="panel p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <div className={card.color}>{card.icon}</div>
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {value != null ? card.format(value as number) : '—'}
                  </p>
                  <p className="text-sm text-rideflow-muted">{card.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* My organizations */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3">
          Mis organizaciones
        </h2>
        {memberships.length === 0 ? (
          <EmptyState
            title="Sin organizaciones"
            description="Aún no perteneces a ninguna organización."
            action={
              <Link
                href="/organizations"
                className="inline-flex px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
              >
                Explorar organizaciones
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {memberships.map(
              (m: {
                role: string;
                organization: { id: string; name: string; slug: string };
              }) => (
                <Link
                  key={m.organization.id}
                  href={`/organizations/${m.organization.id}`}
                  className="panel p-4 hover:border-rideflow-amber/50 transition flex items-center justify-between group"
                >
                  <div>
                    <p className="font-medium group-hover:text-rideflow-amber transition">
                      {m.organization.name}
                    </p>
                    <p className="text-sm text-rideflow-muted">
                      {m.organization.slug}
                    </p>
                  </div>
                  <StatusBadge status={m.role} />
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
