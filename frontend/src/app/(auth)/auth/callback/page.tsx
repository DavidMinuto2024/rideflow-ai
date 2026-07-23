'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="panel w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-display font-bold mb-2">
            Error de autenticación
          </h1>
          <p className="text-rideflow-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-rideflow-border border-t-rideflow-amber mx-auto mb-4" />
        <p className="text-rideflow-muted">Completando inicio de sesión...</p>
      </div>
    </div>
  );
}
