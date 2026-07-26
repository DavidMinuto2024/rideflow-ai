import Link from 'next/link';
import { Building2, Route, LayoutDashboard } from 'lucide-react';
import { Beams } from '@/components/ui/aceternity/Beams';
import { GradientText } from '@/components/ui/aceternity/GradientText';
import { GlassCard } from '@/components/ui/aceternity/GlassCard';
import { GlowButton } from '@/components/ui/aceternity/GlowButton';

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <GlassCard glow className="p-6 text-left">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10">
        {icon}
      </div>
      <h3 className="mb-1 font-display font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-text-secondary">{description}</p>
    </GlassCard>
  );
}

export default function HomePage() {
  return (
    <Beams intensity="subtle">
      <div className="relative z-10 flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
        <GradientText as="h1" className="text-4xl font-bold tracking-tight font-display sm:text-5xl">
          RideFlow AI
        </GradientText>
        <p className="mt-4 max-w-lg text-lg text-text-secondary">
          Carpooling inteligente para tu organización. Coordina, optimiza y
          comparte trayectos de forma sencilla.
        </p>

        <div className="mt-10 flex gap-4">
          <Link href="/login">
            <GlowButton>Iniciar sesión</GlowButton>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg border border-border px-6 py-3 font-semibold transition hover:bg-surface-hover"
          >
            Registrarse
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Building2 className="size-5 text-primary" />}
            title="Organizaciones"
            description="Multi-tenant: cada organización gestiona sus propios miembros, vehículos y eventos."
          />
          <FeatureCard
            icon={<Route className="size-5 text-primary" />}
            title="Eventos + Rutas"
            description="Ciclo de vida completo del evento. Asignación inteligente por cercanía."
          />
          <FeatureCard
            icon={<LayoutDashboard className="size-5 text-primary" />}
            title="Dashboard"
            description="KPIs en tiempo real: ocupación, km ahorrados, CO₂ evitado."
          />
        </div>
      </div>
    </Beams>
  );
}
