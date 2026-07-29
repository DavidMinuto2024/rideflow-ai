'use client';

import { Bell, Check, CheckCheck, Car, Clock, UserPlus, X, XCircle } from 'lucide-react';
import {
  useNotifications,
  useMarkAsRead,
  type NotificationType,
} from '@/lib/queries/notifications';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const typeConfig: Record<
  NotificationType,
  { icon: React.ReactNode; label: string; variant: 'info' | 'success' | 'error' | 'warning' | 'default' }
> = {
  RIDE_REQUESTED: {
    icon: <UserPlus className="size-4" />,
    label: 'Solicitud de viaje',
    variant: 'info',
  },
  RIDE_APPROVED: {
    icon: <Check className="size-4" />,
    label: 'Viaje aprobado',
    variant: 'success',
  },
  RIDE_REJECTED: {
    icon: <X className="size-4" />,
    label: 'Viaje rechazado',
    variant: 'error',
  },
  RIDE_CANCELLED: {
    icon: <XCircle className="size-4" />,
    label: 'Cancelación',
    variant: 'error',
  },
  TRIP_ASSIGNED: {
    icon: <Car className="size-4" />,
    label: 'Viaje asignado',
    variant: 'warning',
  },
  EVENT_REMINDER: {
    icon: <Clock className="size-4" />,
    label: 'Recordatorio',
    variant: 'info',
  },
};

function NotificationsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const handleMarkAllRead = () => {
    if (!notifications) return;
    notifications
      .filter((n) => !n.read)
      .forEach((n) => markAsRead.mutate(n.id));
  };

  if (isLoading) return <NotificationsSkeleton />;

  return (
    <PageContainer
      title="Notificaciones"
      description="Tus notificaciones y alertas"
    >
      {!notifications || notifications.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Bell className="mx-auto mb-3 size-12 text-text-muted" />
            <h3 className="mb-1 font-display font-semibold">Sin notificaciones</h3>
            <p className="text-sm text-text-secondary">
              No tienes notificaciones por ahora.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] ?? {
              icon: <Bell className="size-4" />,
              label: n.type,
              variant: 'default' as const,
            };

            return (
              <Card
                key={n.id}
                glass
                className={`transition ${
                  !n.read
                    ? 'border-l-2 border-l-primary bg-primary/[0.02]'
                    : ''
                }`}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className={`flex shrink-0 size-9 items-center justify-center rounded-full bg-surface-hover`}>
                    <span className={`${
                      cfg.variant === 'error' ? 'text-destructive' :
                      cfg.variant === 'success' ? 'text-success' :
                      cfg.variant === 'warning' ? 'text-warning' :
                      'text-primary'
                    }`}>
                      {cfg.icon}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-center gap-2">
                      <Badge variant={cfg.variant} className="uppercase tracking-wider">
                        {cfg.label}
                      </Badge>
                      {!n.read && (
                        <span className="size-2 shrink-0 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className={`text-sm ${!n.read ? 'font-medium' : 'text-text-secondary'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-text-muted">
                        {n.message}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-text-muted">
                      {new Date(n.createdAt).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {!n.read && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsRead.mutate(n.id)}
                      disabled={markAsRead.isPending}
                    >
                      {markAsRead.isPending ? (
                        <span className="text-text-muted">...</span>
                      ) : (
                        <Check className="size-4" />
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {notifications.some((n) => !n.read) && (
            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="size-4" />
                Marcar todas como leídas
              </Button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
