'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/Card';
import { GlassCard } from '@/components/ui/aceternity/GlassCard';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      if (data.session) {
        router.push('/dashboard');
      } else {
        // Try handling the hash fragment (OAuth redirect)
        const { data: hashData, error: hashError } =
          await supabase.auth.setSession({
            access_token: '',
            refresh_token: '',
          });

        // Just try getting session again
        const { data: retryData } = await supabase.auth.getSession();
        if (retryData.session) {
          router.push('/dashboard');
        } else {
          setError(hashError?.message ?? 'No se pudo iniciar sesión');
        }
      }
    };

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <GlassCard glow className="w-full max-w-md p-0">
          <CardContent className="p-8 text-center">
            <XCircle className="mx-auto mb-4 size-12 text-destructive" />
            <h1 className="mb-2 text-xl font-display font-bold">
              Error de autenticación
            </h1>
            <p className="text-text-secondary">{error}</p>
          </CardContent>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
        <p className="text-text-secondary">Completando inicio de sesión...</p>
      </div>
    </div>
  );
}
