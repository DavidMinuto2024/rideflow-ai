import type { ReactNode } from 'react';

interface PageContainerProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageContainer({
  title,
  description,
  action,
  children,
}: PageContainerProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-rideflow-muted">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel p-12 text-center">
      {icon && <div className="mb-4 text-rideflow-muted2 flex justify-center">{icon}</div>}
      <h3 className="text-lg font-display font-semibold text-rideflow-text">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-rideflow-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-500/20 text-gray-300',
    PUBLISHED: 'bg-blue-500/20 text-blue-300',
    OPEN: 'bg-green-500/20 text-green-300',
    CLOSED: 'bg-yellow-500/20 text-yellow-300',
    FINISHED: 'bg-purple-500/20 text-purple-300',
    ACTIVE: 'bg-green-500/20 text-green-300',
    INACTIVE: 'bg-red-500/20 text-red-300',
    SUPER_ADMIN: 'bg-purple-500/20 text-purple-300',
    ORG_ADMIN: 'bg-blue-500/20 text-blue-300',
    DRIVER: 'bg-green-500/20 text-green-300',
    PASSENGER: 'bg-yellow-500/20 text-yellow-300',
  };

  const color = colors[status] ?? 'bg-rideflow-panel2 text-rideflow-muted';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}
