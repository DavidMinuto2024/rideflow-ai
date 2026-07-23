import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight">
        RideFlow{' '}
        <span className="text-rideflow-amber">AI</span>
      </h1>
      <p className="mt-4 text-rideflow-muted text-lg max-w-lg">
        Carpooling inteligente para tu organización. Coordina, optimiza y
        comparte trayectos de forma sencilla.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/signup"
          className="px-6 py-3 border border-rideflow-border text-rideflow-text font-semibold rounded-lg hover:bg-rideflow-panel transition"
        >
          Registrarse
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        <FeatureCard
          title="Organizaciones"
          description="Multi-tenant: cada organización gestiona sus propios miembros, vehículos y eventos."
        />
        <FeatureCard
          title="Eventos + Rutas"
          description="Ciclo de vida completo del evento. Asignación inteligente por cercanía."
        />
        <FeatureCard
          title="Dashboard"
          description="KPIs en tiempo real: ocupación, km ahorrados, CO₂ evitado."
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="panel p-6 text-left">
      <h3 className="font-display font-semibold text-rideflow-text mb-2">
        {title}
      </h3>
      <p className="text-sm text-rideflow-muted leading-relaxed">
        {description}
      </p>
    </div>
  );
}
