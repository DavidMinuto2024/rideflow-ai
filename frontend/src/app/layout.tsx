import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'RideFlow AI — Carpooling Inteligente',
  description:
    'Plataforma de carpooling multi-tenant para organizaciones, eventos y trayectos compartidos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-rideflow-bg text-rideflow-text font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
