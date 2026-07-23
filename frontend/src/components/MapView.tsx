'use client';

import { MapContainer, TileLayer, ZoomControl, Marker, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

// Fix Leaflet default icon issue with bundlers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TILE_URL =
  process.env.NEXT_PUBLIC_TILE_URL ||
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

const DEFAULT_CENTER: [number, number] = [4.76, -74.05]; // Bogotá
const DEFAULT_ZOOM = 10.6;

// Custom marker icons
const originIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#22c55e;border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/** Decode OSRM polyline6 encoded string to [lat, lng][] */
function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  try {
    const coords: [number, number][] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      coords.push([lat / 1e5, lng / 1e5]);
    }
    return coords;
  } catch {
    return [];
  }
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  className?: string;
  originLat?: number;
  originLng?: number;
  destLat?: number;
  destLng?: number;
  routeGeometry?: string;
  originLabel?: string;
  destLabel?: string;
}

export default function MapView({
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  className = '',
  originLat,
  originLng,
  destLat,
  destLng,
  routeGeometry,
  originLabel,
  destLabel,
}: MapViewProps) {
  useEffect(() => {
    // Force re-render after mount (fixes SSR hydration)
  }, []);

  const routePositions = useMemo(() => {
    if (routeGeometry) {
      const decoded = decodePolyline(routeGeometry);
      if (decoded.length > 1) return decoded;
    }
    // Fallback: straight line between origin and destination
    if (
      originLat != null &&
      originLng != null &&
      destLat != null &&
      destLng != null
    ) {
      return [
        [originLat, originLng] as [number, number],
        [destLat, destLng] as [number, number],
      ];
    }
    return [];
  }, [routeGeometry, originLat, originLng, destLat, destLng]);

  const hasOrigin = originLat != null && originLng != null;
  const hasDest = destLat != null && destLng != null;

  // Compute bounds to fit all markers
  const bounds = useMemo(() => {
    const pts: [number, number][] = [];
    if (hasOrigin) pts.push([originLat!, originLng!]);
    if (hasDest) pts.push([destLat!, destLng!]);
    if (routePositions.length > 0) pts.push(...routePositions);
    return pts.length > 0 ? L.latLngBounds(pts.map((p) => L.latLng(p[0], p[1]))) : null;
  }, [hasOrigin, hasDest, originLat, originLng, destLat, destLng, routePositions]);

  // effective center: bounds center if we have points, else default
  const effectiveCenter: [number, number] =
    bounds && routePositions.length > 1
      ? [bounds.getCenter().lat, bounds.getCenter().lng]
      : center;

  return (
    <MapContainer
      center={effectiveCenter}
      zoom={bounds ? undefined : zoom}
      bounds={bounds ?? undefined}
      zoomControl={false}
      scrollWheelZoom={false}
      className={`h-96 w-full rounded-xl ${className}`}
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        url={TILE_URL}
        attribution="&copy; <a href='https://openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      />

      {hasOrigin && (
        <Marker position={[originLat!, originLng!]} icon={originIcon}>
          <Popup>{originLabel || 'Origen'}</Popup>
        </Marker>
      )}

      {hasDest && (
        <Marker position={[destLat!, destLng!]} icon={destIcon}>
          <Popup>{destLabel || 'Destino'}</Popup>
        </Marker>
      )}

      {routePositions.length > 1 && (
        <Polyline
          positions={routePositions}
          pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.7 }}
        />
      )}
    </MapContainer>
  );
}
