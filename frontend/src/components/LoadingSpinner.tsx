export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-rideflow-border border-t-rideflow-amber" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-rideflow-panel2 rounded-lg" />
      <div className="h-4 w-72 bg-rideflow-panel2 rounded" />
      <div className="h-64 bg-rideflow-panel rounded-xl" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="panel p-6 space-y-3 animate-pulse">
      <div className="h-5 w-3/4 bg-rideflow-panel2 rounded" />
      <div className="h-4 w-1/2 bg-rideflow-panel2 rounded" />
      <div className="h-4 w-full bg-rideflow-panel2 rounded" />
    </div>
  );
}
