'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSession, useProfile } from '@/lib/queries/auth';
import { useUpdateProfile } from '@/lib/queries/users';
import { PageContainer, StatusBadge } from '@/components/PageContainer';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';

export default function ProfilePage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { data: sessionData } = useSession();
  const { data: profile, isLoading: profileLoading, refetch } = useProfile();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useUpdateProfile();

  if (authLoading || profileLoading) return <LoadingSpinner />;

  const p = profile; // API profile (has name, phone, avatar)
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
      <div className="panel p-6">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-rideflow-amber/20 flex items-center justify-center text-2xl font-bold text-rideflow-amber shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-display font-bold">
              {displayName || 'Sin nombre'}
            </h2>
            <p className="text-rideflow-muted">{email}</p>
            {p?.phone && (
              <p className="text-sm text-rideflow-muted2 mt-1">
                📞 {p.phone}
              </p>
            )}

            {!editing && (
              <button
                onClick={handleEdit}
                className="mt-3 px-4 py-1.5 bg-rideflow-amber/10 text-rideflow-amber border border-rideflow-amber/30 rounded-lg text-sm font-medium hover:brightness-110 transition"
              >
                Editar perfil
              </button>
            )}
          </div>
        </div>

        {/* Edit form */}
        {editing && (
          <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4 border-t border-rideflow-border pt-6">
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-rideflow-muted mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
                placeholder="+57 300 123 4567"
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 text-sm"
              >
                {updateProfile.isPending ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 border border-rideflow-border rounded-lg text-rideflow-muted hover:text-rideflow-text transition text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Memberships */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3">Membresías</h2>
        {memberships.length === 0 ? (
          <div className="panel p-6 text-center">
            <p className="text-rideflow-muted text-sm">
              No perteneces a ninguna organización.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => (
              <div
                key={m.organization.id}
                className="panel p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">{m.organization.name}</p>
                  <p className="text-sm text-rideflow-muted">
                    {m.organization.slug}
                  </p>
                </div>
                <StatusBadge status={m.role} />
              </div>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
