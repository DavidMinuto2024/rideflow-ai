'use client';

import { CalendarDays, Users, Navigation, Clock, Car, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useSession } from '@/lib/queries/auth';
import { useDashboardStats } from '@/lib/queries/dashboard';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';

const statCards = [
  {
    key: 'activeEvents' as const,
    label: 'Eventos Activos',
    icon: CalendarDays,
    color: 'text-accent',
    bg: 'bg-accent/10',
    format: (v: number) => v,
  },
  {
    key: 'totalParticipants' as const,
    label: 'Total Participantes',
    icon: Users,
    color: 'text-success',
    bg: 'bg-success/10',
    format: (v: number) => v,
  },
  {
    key: 'tripsToday' as const,
    label: 'Viajes Hoy',
    icon: Navigation,
    color: 'text-primary',
    bg: 'bg-primary/10',
    format: (v: number) => v,
  },
  {
    key: 'pendingRequests' as const,
    label: 'Solicitudes Pendientes',
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    format: (v: number) => v,
  },
  {
    key: 'vehicleUtilization' as const,
    label: 'Uso de Vehículos',
    icon: Car,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    format: (v: number) => `${Math.round(v * 100)}%`,
  },
] as const;

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch,
  } = useDashboardStats();

  if (sessionLoading || statsLoading) return <DashboardSkeleton />;

  const memberships = sessionData?.memberships ?? [];

  return (
    <PageContainer
      title="Dashboard"
      description="Bienvenido de nuevo, resume tus organizaciones y actividad."
    >
      {/* Stats error banner */}
      {statsError && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {statsError instanceof ApiError
              ? statsError.message
              : 'Error al cargar estadísticas'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Reintentar
          </Button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const value = stats?.[card.key];
          const Icon = card.icon;
          return (
            <Card key={card.key}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-10 items-center justify-center rounded-lg ${card.bg}`}
                  >
                    <Icon className={`size-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">
                      {value != null ? card.format(value as number) : '—'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {card.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* My organizations */}
      <div>
        <h2 className="mb-3 text-lg font-display font-semibold">
          Mis organizaciones
        </h2>
        {memberships.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-display font-semibold text-text-primary">
                Sin organizaciones
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Aún no perteneces a ninguna organización.
              </p>
              <div className="mt-4">
                <Link href="/organizations">
                  <Button variant="default">Explorar organizaciones</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {memberships.map((m) => (
              <Link
                key={m.organization.id}
                href={`/organizations/${m.organization.id}`}
                className="block"
              >
                <Card className="transition hover:border-primary/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-text-primary transition group-hover:text-primary">
                        {m.organization.name}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {m.organization.slug}
                      </p>
                    </div>
                    <Badge variant={roleToBadgeVariant(m.role)}>
                      {m.role}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function roleToBadgeVariant(
  role: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ORG_ADMIN':
      return 'info';
    case 'DRIVER':
      return 'success';
    case 'PASSENGER':
      return 'warning';
    default:
      return 'outline';
  }
}
