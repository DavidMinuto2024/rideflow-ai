'use client';

import { useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/queries/auth';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const ROLE_HIERARCHY: Record<string, number> = {
  SUPER_ADMIN: 100,
  ORG_ADMIN: 80,
  DRIVER: 60,
  PASSENGER: 40,
};

function resolveEffectiveRole(
  memberships: Array<{ role: string }>,
): string | null {
  if (memberships.length === 0) return null;
  return memberships.reduce<string>((highest, m) => {
    const currentLevel = ROLE_HIERARCHY[m.role] ?? 0;
    const highestLevel = ROLE_HIERARCHY[highest] ?? 0;
    return currentLevel > highestLevel ? m.role : highest;
  }, memberships[0].role);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: sessionData, isLoading } = useSession();

  const effectiveRole = useMemo(
    () => resolveEffectiveRole(sessionData?.memberships ?? []),
    [sessionData],
  );

  useEffect(() => {
    if (isLoading) return;
    if (effectiveRole !== 'SUPER_ADMIN') {
      router.replace('/dashboard');
    }
  }, [isLoading, effectiveRole, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (effectiveRole !== 'SUPER_ADMIN') {
    return null;
  }

  return <>{children}</>;
}
