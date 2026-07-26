'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSession, useProfile } from '@/lib/queries/auth';
import { useUpdateProfile } from '@/lib/queries/users';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { GradientText } from '@/components/ui/aceternity/GradientText';
import { ApiError } from '@/lib/api';
import { User, Phone, Building2 } from 'lucide-react';

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  );
}

const roleBadge: Record<string, 'info' | 'success' | 'default'> = {
  ORG_ADMIN: 'info',
  DRIVER: 'success',
  PASSENGER: 'default',
};

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { data: sessionData } = useSession();
  const { data: profile, isLoading: profileLoading, refetch } = useProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useUpdateProfile();

  if (authLoading || profileLoading) return <ProfileSkeleton />;

  const p = profile;
  const email = authUser?.email ?? '';
  const displayName = p?.name ?? (authUser?.user_metadata?.full_name as string | undefined) ?? '';
  const memberships = sessionData?.memberships ?? [];

  const handleEdit = () => {
    setName(displayName);
    setPhone(p?.phone ?? '');
    setEditing(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateProfile.mutateAsync({ name, phone: phone || undefined });
      await refetch();
      setEditing(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al actualizar perfil');
      }
    }
  };

  const initial = (email?.[0] ?? '?').toUpperCase();

  return (
    <PageContainer
      title="Mi Perfil"
      description="Información de tu cuenta y membresías"
    >
      {/* Profile card */}
      <Card glass>
        <CardContent className="p-6">
          <div className="flex items-start gap-5">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-display font-bold">
                {displayName || 'Sin nombre'}
              </h2>
              <p className="text-text-secondary">{email}</p>
              {p?.phone && (
                <p className="mt-1 flex items-center gap-1 text-sm text-text-muted">
                  <Phone className="size-3.5" />
                  {p.phone}
                </p>
              )}

              {!editing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEdit}
                  className="mt-3"
                >
                  <User className="size-4" />
                  Editar perfil
                </Button>
              )}
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4 border-t border-border pt-6">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Nombre
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">
                  Teléfono
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+57 300 123 4567"
                />
              </div>
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Memberships */}
      <section>
        <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">Membresías</GradientText>
        {memberships.length === 0 ? (
          <Card glass>
            <CardContent className="p-6 text-center">
              <Building2 className="mx-auto mb-2 size-8 text-text-muted" />
              <p className="text-sm text-text-secondary">
                No perteneces a ninguna organización.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {memberships.map((m) => (
              <Card key={m.organization.id} glass>
                  <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{m.organization.name}</p>
                    <p className="text-sm text-text-secondary">
                      {m.organization.slug}
                    </p>
                  </div>
                  <Badge variant={roleBadge[m.role] ?? 'default'}>
                    {m.role}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
