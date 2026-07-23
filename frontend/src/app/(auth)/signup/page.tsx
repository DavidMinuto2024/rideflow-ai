'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // If session is returned immediately (no email confirmation), redirect
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
        <div className="panel w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-rideflow-amber/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-rideflow-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">
            Revisa tu correo
          </h1>
          <p className="text-rideflow-muted">
            Te enviamos un enlace de confirmación a{' '}
            <strong className="text-rideflow-text">{email}</strong>.
          </p>
          <p className="mt-2 text-sm text-rideflow-muted2">
            Una vez confirmado, puedes{' '}
            <Link href="/login" className="text-rideflow-amber hover:underline">
              iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4">
      <div className="panel w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm text-rideflow-muted">
            Regístrate para empezar a usar RideFlow
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-rideflow-muted mb-1"
            >
              Nombre completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text placeholder-rideflow-muted2 focus:outline-none focus:border-rideflow-amber focus:ring-1 focus:ring-rideflow-amber/30 transition"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-rideflow-muted mb-1"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text placeholder-rideflow-muted2 focus:outline-none focus:border-rideflow-amber focus:ring-1 focus:ring-rideflow-amber/30 transition"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-rideflow-muted mb-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text placeholder-rideflow-muted2 focus:outline-none focus:border-rideflow-amber focus:ring-1 focus:ring-rideflow-amber/30 transition"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-rideflow-muted2">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="text-rideflow-amber hover:underline font-medium"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
