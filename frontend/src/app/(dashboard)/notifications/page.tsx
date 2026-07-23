'use client';

import {
  useNotifications,
  useMarkAsRead,
  type NotificationType,
} from '@/lib/queries/notifications';
import { PageContainer, EmptyState } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';

const typeConfig: Record<
  NotificationType,
  { icon: string; label: string; color: string }
> = {
  RIDE_REQUESTED: {
    icon: '→',
    label: 'Solicitud de viaje',
    color: 'text-blue-400',
  },
  RIDE_APPROVED: {
    icon: '✓',
    label: 'Viaje aprobado',
    color: 'text-green-400',
  },
  RIDE_REJECTED: {
    icon: '✕',
    label: 'Viaje rechazado',
    color: 'text-red-400',
  },
  TRIP_ASSIGNED: {
    icon: '🚗',
    label: 'Viaje asignado',
    color: 'text-rideflow-amber',
  },
  EVENT_REMINDER: {
    icon: '⏰',
    label: 'Recordatorio',
    color: 'text-yellow-400',
  },
};

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  if (isLoading) return <PageSkeleton />;

  return (
    <PageContainer
      title="Notificaciones"
      description="Tus notificaciones y alertas"
    >
      {!notifications || notifications.length === 0 ? (
        <EmptyState
          title="Sin notificaciones"
          description="No tienes notificaciones por ahora."
          icon={
            <svg
              className="w-12 h-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          }
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] ?? {
              icon: '•',
              label: n.type,
              color: 'text-rideflow-muted',
            };

            return (
              <div
                key={n.id}
                className={`panel p-4 flex items-start gap-3 transition ${
                  !n.read
                    ? 'border-l-2 border-l-rideflow-amber bg-rideflow-amber/[0.03]'
                    : ''
                }`}
              >
                {/* Type icon */}
                <div
                  className={`w-9 h-9 rounded-full bg-rideflow-panel2 flex items-center justify-center text-sm shrink-0 ${cfg.color}`}
                >
                  {cfg.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-rideflow-muted2 uppercase tracking-wider">
                      {cfg.label}
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-rideflow-amber shrink-0" />
                    )}
                  </div>
                  <p
                    className={`text-sm ${
                      !n.read ? 'font-medium text-rideflow-text' : 'text-rideflow-muted'
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="text-xs text-rideflow-muted2 mt-0.5">
                      {n.message}
                    </p>
                  )}
                  <p className="text-xs text-rideflow-muted2 mt-1.5">
                    {new Date(n.createdAt).toLocaleDateString('es', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Mark as read button */}
                {!n.read && (
                  <button
                    onClick={() => markAsRead.mutate(n.id)}
                    disabled={markAsRead.isPending}
                    className="shrink-0 px-2.5 py-1 text-xs font-medium text-rideflow-muted hover:text-rideflow-amber bg-rideflow-panel2 rounded-lg transition disabled:opacity-50"
                  >
                    {markAsRead.isPending ? '...' : 'Leído'}
                  </button>
                )}
              </div>
            );
          })}

          {/* Mark all as read */}
          {notifications.some((n) => !n.read) && (
            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  notifications
                    .filter((n) => !n.read)
                    .forEach((n) => markAsRead.mutate(n.id));
                }}
                className="text-xs text-rideflow-muted hover:text-rideflow-amber transition"
              >
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
