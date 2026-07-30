'use client';

import { Building2, Users, CalendarDays, Navigation, RefreshCw } from 'lucide-react';
import { useAdminStats } from '@/lib/queries/admin';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/api';

const statCards = [
  { key: 'totalOrganizations' as const, label: 'Total Organizations', icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'totalUsers' as const, label: 'Total Users', icon: Users, color: 'text-success', bg: 'bg-success/10' },
  { key: 'totalEvents' as const, label: 'Total Events', icon: CalendarDays, color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'totalTrips' as const, label: 'Total Trips', icon: Navigation, color: 'text-secondary', bg: 'bg-secondary/10' },
];

function AdminDashboardSkeleton() {
  return (
    <PageContainer title="Admin" description="System-wide administration">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-48 rounded-xl" />
    </PageContainer>
  );
}

export default function AdminPage() {
  const { data: stats, isLoading, error, refetch } = useAdminStats();

  if (isLoading) return <AdminDashboardSkeleton />;

  return (
    <PageContainer
      title="Admin"
      description="System-wide administration"
      action={
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      }
    >
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : 'Error loading stats'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const value = stats?.[card.key];
          const Icon = card.icon;
          return (
            <Card key={card.key} glass>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${card.bg}`}>
                    <Icon className={`size-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">
                      {value != null ? value : '—'}
                    </p>
                    <p className="text-sm text-text-secondary">{card.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats?.eventsPerMonth && stats.eventsPerMonth.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-display font-semibold">Events per Month</h2>
          <Card glass>
            <CardContent className="p-5">
              <div className="flex items-end gap-2" style={{ height: '160px' }}>
                {(() => {
                  const maxCount = Math.max(...stats.eventsPerMonth.map((e) => e.count));
                  return stats.eventsPerMonth.map((item) => {
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <span className="text-xs text-text-secondary">{item.count}</span>
                        <div
                          className="w-full rounded-t bg-primary/70 hover:bg-primary transition-colors"
                          style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                        />
                        <span className="text-xs text-text-secondary truncate w-full text-center">
                          {item.month}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {(!stats?.eventsPerMonth || stats.eventsPerMonth.length === 0) && (
        <Card glass>
          <CardContent className="p-8 text-center">
            <CalendarDays className="mx-auto mb-2 size-8 text-text-muted" />
            <p className="text-sm text-text-secondary">No event data available yet.</p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
