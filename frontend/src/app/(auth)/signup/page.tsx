'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Card, CardContent } from '@/components/ui/Card';
import { useFormField } from '@/hooks/useFormField';

const validateName = (v: string) =>
  !v
    ? 'El nombre es requerido'
    : v.length < 2
      ? 'Mínimo 2 caracteres'
      : undefined;

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

function SuccessState({ email }: { email: string }) {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-8 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-display font-bold">
          Revisa tu correo
        </h1>
        <p className="text-text-secondary">
          Te enviamos un enlace de confirmación a{' '}
          <strong className="text-text-primary">{email}</strong>.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Una vez confirmado, puedes{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            iniciar sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const name = useFormField({ validate: validateName });
  const email = useFormField({ validate: validateEmail });
  const password = useFormField({ validate: validatePassword });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const isNameValid = name.validateField();
    const isEmailValid = email.validateField();
    const isPassValid = password.validateField();
    if (!isNameValid || !isEmailValid || !isPassValid) return;

    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: {
        data: { full_name: name.value },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push('/dashboard');
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <SuccessState email={email.value} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display font-bold">Crear cuenta</h1>
            <p className="mt-2 text-sm text-text-secondary">
              Regístrate para empezar a usar RideFlow
            </p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <FormField
              label="Nombre completo"
              error={name.error}
              touched={name.touched}
              id="name"
            >
              <Input
                id="name"
                type="text"
                value={name.value}
                onChange={name.onChange}
                onBlur={name.onBlur}
                error={!!name.error && name.touched}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </FormField>

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
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
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

            <Button type="submit" loading={loading} className="w-full">
              Crear cuenta
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
