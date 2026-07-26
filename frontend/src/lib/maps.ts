/**
 * RideFlow AI — Waze / Google Maps deep link URL builders
 *
 * All URLs are parameter-driven (no API keys needed).
 */

/**
 * Build a Waze deep link to navigate to a single destination.
 */
export function buildWazeDeepLink(destLat: number, destLng: number): string {
  return `https://www.waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
}

/**
 * Build a Waze deep link with multiple stops.
 * The last stop is treated as the final destination; preceding stops are waypoints.
 */
export function buildWazeRouteLink(
  stops: Array<{ lat: number; lng: number }>,
): string {
  if (stops.length === 0) return '#';
  const dest = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);
  const wp = waypoints.map((s) => `&stop=${s.lat},${s.lng}`).join('');
  return `https://www.waze.com/ul?ll=${dest.lat},${dest.lng}&navigate=yes${wp}`;
}

/**
 * Build a Google Maps deep link with address-based origin, destination, and waypoints.
 */
export function buildGoogleMapsDeepLink(
  origin: string,
  dest: string,
  waypoints: string[] = [],
): string {
  const base = `https://www.google.com/maps/dir/?api=1`;
  const params = new URLSearchParams({
    origin,
    destination: dest,
  });
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.join('|'));
  }
  return `${base}&${params.toString()}`;
}

/**
 * Build a Google Maps deep link with coordinate-based waypoints.
 */
export function buildGoogleMapsCoordsLink(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  waypoints: Array<{ lat: number; lng: number }> = [],
): string {
  const origin = `${originLat},${originLng}`;
  const dest = `${destLat},${destLng}`;
  const wp = waypoints.map((p) => `${p.lat},${p.lng}`).join('|');
  const base = `https://www.google.com/maps/dir/?api=1`;
  const params = new URLSearchParams({ origin, destination: dest });
  if (wp) params.set('waypoints', wp);
  return `${base}&${params.toString()}`;
}
