# Proposal: Address Autocomplete with Geocoding

## Intent

Los campos de dirección en tres formularios críticos son inputs de texto libre sin ningún autocomplete ni geocodificación. El resultado es que `lat/lng` nunca se guarda en la BD, rompiendo toda la funcionalidad de mapa (MapView, Waze/Google Maps deep links, OSRM route optimization, driver suggestions).

Formularios afectados:
- `/events/new` → campo `destination` (y `origin` que ni aparece)
- `/invite/[token]` driver-form → campo `startLocation`
- `/invite/[token]` passenger-form → campo `pickupAddress`

## Scope

### In Scope
- Componente `AddressAutocomplete` con dropdown de sugerencias via Nominatim (OSM, sin API key)
- Geocodificación automática al seleccionar una sugerencia (lat/lng)
- Reemplazar los 3 inputs afectados con el nuevo componente
- Enviar `originLat/originLng/destLat/destLng` en `useCreateEvent`
- Enviar `startLat/startLng` en `useRegisterEventVehicle` / `joinEvent` driver
- Enviar `pickupLat/pickupLng` en `joinEvent` passenger

### Out of Scope
- Mapa interactivo de pin-drop (click en mapa para elegir coordenadas)
- Geocodificación inversa (coords → dirección)
- Backend geocoding service / proxy
- Cambios al schema de BD o al backend

## Capabilities

### New Capabilities
- `address-autocomplete`: Componente UI reutilizable con búsqueda Nominatim, debounce, y callback `onSelect({ address, lat, lng })`

### Modified Capabilities
- None

## Approach

Usar la API pública de Nominatim (`https://nominatim.openstreetmap.org/search`) con:
- Debounce de 400 ms para evitar flood de requests
- `countrycodes=co` como default configurable vía prop
- `limit=5` sugerencias
- `User-Agent` header obligatorio (requerido por Nominatim ToS)
- Dropdown accesible con teclado (↑↓ Enter Esc)
- Al seleccionar: llena el input con `display_name` y llama `onSelect({ address, lat, lng })`

El componente es drop-in replacement del `<Input>` existente — misma API de estilos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/components/ui/AddressAutocomplete.tsx` | New | Componente con autocomplete + geocodificación |
| `frontend/src/app/(dashboard)/events/new/page.tsx` | Modified | `destination` y `origin` usan `AddressAutocomplete`; se agregan coords al payload |
| `frontend/src/app/invite/[token]/page.tsx` | Modified | Driver `startLocation` y passenger `pickupAddress` usan `AddressAutocomplete`; coords ya en estado, ahora se llenan |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nominatim rate limit (1 req/s) | Med | Debounce 400 ms + no llamar con < 3 caracteres |
| Nominatim sin resultados para direcciones colombianas parciales | Med | Placeholder guía, fallback: texto libre sigue siendo válido |
| Cambio de API pública sin aviso | Low | Wrapper aislado, fácil de swapear por otro proveedor |

## Rollback Plan

Los inputs de texto libre siguen siendo válidos como fallback (el campo sigue siendo string). Si el componente falla, revertir los 3 imports a `<Input type="text">`. Las coordenadas son opcionales en el backend — no hay migration de BD.

## Dependencies

- Nominatim OSM API (sin key, solo requiere User-Agent header)
- No nuevas dependencias npm necesarias (fetch nativo)

## Success Criteria

- [ ] Al tipear 3+ caracteres en cualquier campo de dirección aparece un dropdown con sugerencias reales
- [ ] Al seleccionar una sugerencia, `lat` y `lng` se guardan en el estado del formulario
- [ ] Al crear un evento, `destLat`/`destLng` se envían al backend
- [ ] Al unirse como conductor, `startLat`/`startLng` se envían al backend
- [ ] Al unirse como pasajero, `pickupLat`/`pickupLng` se envían al backend
- [ ] El MapView del evento muestra el marcador cuando `originLat`/`originLng` existen
