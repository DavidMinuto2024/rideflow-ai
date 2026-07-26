'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Plus, ArrowUpRight } from 'lucide-react';
import { useOrganizations, useCreateOrganization } from '@/lib/queries/organizations';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

function OrgCardSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="mb-3 size-12 rounded-lg" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-1 h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateOrganizationForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createOrg = useCreateOrganization();

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createOrg.mutateAsync({ name, slug });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al crear la organización');
      }
    }
  };

  return (
    <Card glass className="mb-6">
      <CardContent className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">
          Nueva organización
        </h3>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Nombre
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Mi Organización"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Slug
            </label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              placeholder="mi-organizacion"
              className="font-mono"
            />
            <p className="mt-1 text-xs text-text-muted">
              Identificador único usado en URLs
            </p>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={createOrg.isPending}>
              {createOrg.isPending ? 'Creando...' : 'Crear'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function OrganizationsPage() {
  const { data: orgs, isLoading, error } = useOrganizations();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <OrgCardSkeleton />;

  if (error) {
    return (
      <PageContainer title="Organizaciones">
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error al cargar organizaciones</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Organizaciones"
      description="Gestiona las organizaciones registradas en RideFlow"
      action={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" />
          Nueva
        </Button>
      }
    >
      {showCreate && <CreateOrganizationForm onClose={() => setShowCreate(false)} />}

      {!orgs || orgs.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Building2 className="mx-auto mb-3 size-10 text-text-muted" />
            <h3 className="mb-1 font-display font-semibold">No hay organizaciones</h3>
            <p className="mb-4 text-sm text-text-secondary">
              Crea la primera organización para empezar.
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="size-4" />
              Crear organización
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card glass className="h-full transition hover:ring-2 hover:ring-primary/40">
                <CardContent className="p-5">
                  <div className="mb-3 flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="size-6 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold group-hover:text-primary transition">
                    {org.name}
                  </h3>
                  <p className="mt-1 text-sm text-text-secondary">{org.slug}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    Creada {new Date(org.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
