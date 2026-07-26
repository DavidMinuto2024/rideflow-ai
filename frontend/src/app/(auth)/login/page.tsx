'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent } from '@/components/ui/Card';
import { GlassCard } from '@/components/ui/aceternity/GlassCard';
import { GradientText } from '@/components/ui/aceternity/GradientText';
import { useFormField } from '@/hooks/useFormField';

const validateEmail = (v: string) =>
  !v
    ? 'El correo es requerido'
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? 'Correo inválido'
      : undefined;

const validatePassword = (v: string) =>
  !v
    ? 'La contraseña es requerida'
    : v.length < 6
      ? 'Mínimo 6 caracteres'
      : undefined;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const email = useFormField({ validate: validateEmail });
  const password = useFormField({ validate: validatePassword });

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const isEmailValid = email.validateField();
    const isPassValid = password.validateField();
    if (!isEmailValid || !isPassValid) return;

    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <GlassCard glow className="w-full max-w-md p-0">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <GradientText as="h1" shimmer={false} className="text-2xl font-display font-bold">
              Iniciar sesión
            </GradientText>
            <p className="mt-2 text-sm text-text-secondary">
              Accede a tu cuenta de RideFlow
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
            <FormField
              label="Correo electrónico"
              error={email.error}
              touched={email.touched}
              id="email"
            >
              <Input
                id="email"
                type="email"
                value={email.value}
                onChange={email.onChange}
                onBlur={email.onBlur}
                error={!!email.error && email.touched}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
              />
            </FormField>

            <FormField
              label="Contraseña"
              error={password.error}
              touched={password.touched}
              id="password"
            >
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password.value}
                  onChange={password.onChange}
                  onBlur={password.onBlur}
                  error={!!password.error && password.touched}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </FormField>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5"
              >
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button type="submit" variant="glow-primary" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>

          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface px-2 text-text-muted">
                o continúa con
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 w-full"
          >
            <svg className="size-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>

          <p className="mt-6 text-center text-sm text-text-muted">
            ¿No tienes cuenta?{' '}
            <Link
              href="/signup"
              className="text-primary hover:underline font-medium"
            >
              Registrarse
            </Link>
          </p>
        </CardContent>
      </GlassCard>
    </div>
  );
}
