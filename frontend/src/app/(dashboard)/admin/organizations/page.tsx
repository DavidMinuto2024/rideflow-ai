'use client';

import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { useAdminOrganizations, adminOrganizationsQueryKey } from '@/lib/queries/admin';
import { useCreateOrganization } from '@/lib/queries/organizations';
import { apiClient, ApiError } from '@/lib/api';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';

function OrgsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-40 rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function DeleteConfirmModal({
  open,
  onClose,
  orgName,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  orgName: string;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Delete Organization">
      <p className="text-sm text-text-secondary">
        Are you sure you want to delete <strong>{orgName}</strong>? This action cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} loading={loading}>
          Delete
        </Button>
      </div>
    </Modal>
  );
}

function CreateOrgModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const createOrg = useCreateOrganization();

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, ''));
  };

  return (
    <Modal open={open} onClose={onClose} title="Create Organization">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Name</label>
          <Input
            placeholder="Organization name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
                handleSlugChange(e.target.value);
              }
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Slug</label>
          <Input
            placeholder="organization-slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={createOrg.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            loading={createOrg.isPending}
            disabled={!name.trim() || !slug.trim()}
            onClick={() =>
              createOrg.mutate(
                { name: name.trim(), slug: slug.trim() },
                {
                  onSuccess: () => {
                    queryClient.invalidateQueries({
                      queryKey: adminOrganizationsQueryKey,
                    });
                    setName('');
                    setSlug('');
                    onClose();
                  },
                },
              )
            }
          >
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminOrganizationsPage() {
  const { data: orgs, isLoading } = useAdminOrganizations();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: adminOrganizationsQueryKey });
      setDeleteTarget(null);
    },
  });

  if (isLoading) return <OrgsSkeleton />;

  return (
    <PageContainer
      title="Organizations"
      description="All platform organizations"
      action={
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="size-4" />
          Create Organization
        </Button>
      }
    >
      {!orgs || orgs.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Building2 className="mx-auto mb-2 size-8 text-text-muted" />
            <p className="text-sm text-text-secondary">No organizations found.</p>
          </CardContent>
        </Card>
      ) : (
        <Card glass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Slug</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Members</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Events</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Created</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((org) => (
                  <tr key={org.id} className="transition hover:bg-surface-hover/50">
                    <td className="px-4 py-3 font-medium">{org.name}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{org.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{org.memberCount}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="default">{org.eventCount}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget({ id: org.id, name: org.name })}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} />

      {deleteTarget && (
        <DeleteConfirmModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          orgName={deleteTarget.name}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          loading={deleteMutation.isPending}
        />
      )}
    </PageContainer>
  );
}
