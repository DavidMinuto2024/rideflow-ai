# Design: Address Autocomplete with Geocoding

## Technical Approach

Crear un único componente `AddressAutocomplete` que encapsula la búsqueda en Nominatim OSM, el debounce, el estado del dropdown, y la navegación por teclado. El componente expone `onSelect({ address, lat, lng })` como único contrato hacia afuera — los formularios que lo usen solo necesitan guardar esos tres valores en su estado local existente. No se modifican queries ni mutaciones del backend; solo se pasan los campos de coordenadas que ya existen en los DTOs.

## Architecture Decisions

### Decision: Nominatim OSM vs alternativas

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Nominatim OSM (gratis) | Rate limit 1 req/s, sin key | ✅ Elegido — ya usan OSM/Leaflet |
| Google Places API | $, requiere key, billing | ❌ Rechazado |
| Mapbox Geocoding API | $, requiere key | ❌ Rechazado |

### Decision: Debounce en cliente vs servidor proxy

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Debounce 400ms en cliente | Simple, sin backend | ✅ Elegido |
| Route handler Next.js como proxy | Oculta User-Agent, más control | Diferir — no requerido por ToS ahora |

**Rationale**: Nominatim permite llamadas directas desde browsers siempre que se incluya `User-Agent` identificando la app. Un proxy añade latencia y complejidad sin beneficio inmediato.

### Decision: Componente standalone vs hook

**Choice**: Componente `AddressAutocomplete.tsx` auto-contenido (UI + lógica de fetch interna).  
**Alternatives considered**: `useAddressSearch` hook separado + componente tonto.  
**Rationale**: Los tres call sites necesitan el mismo UX completo. No hay caso de uso actual para reusar el hook sin la UI. La separación prematura añade archivos sin valor.

## Data Flow

```
User types                    Debounce 400ms
    │                              │
    ▼                              ▼
[AddressAutocomplete]   ──fetch──► Nominatim API
    │                              │
    │◄──── [{display_name, lat, lng}, ...]
    │
    ├── renders dropdown
    │
User selects
    │
    ▼
onSelect({ address, lat, lng })
    │
    ├── /events/new      → setDestination / setDestLat / setDestLng
    ├── /invite driver   → setStartLocation / setStartLat / setStartLng
    └── /invite passenger→ setPickupAddress / setPickupLat / setPickupLng
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/ui/AddressAutocomplete.tsx` | Create | Componente con fetch, debounce, dropdown, teclado |
| `frontend/src/app/(dashboard)/events/new/page.tsx` | Modify | Reemplaza Input destination por AddressAutocomplete; agrega state para origin y coords; los envía en el payload |
| `frontend/src/app/invite/[token]/page.tsx` | Modify | Driver: reemplaza Input startLocation. Passenger: reemplaza inputs manuales lat/lng por AddressAutocomplete |

## Interfaces / Contracts

```typescript
// AddressAutocomplete.tsx

interface AddressSuggestion {
  display_name: string;
  lat: string;  // Nominatim returns strings
  lng: string;  // (field name: "lon")
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: { address: string; lat: number; lng: number }) => void;
  placeholder?: string;
  countryCode?: string;   // default: 'co'
  id?: string;
  required?: boolean;
  disabled?: boolean;
}
```

El componente reutiliza los mismos estilos del `<Input>` existente (misma clase base: `flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm ...`) para mantener consistencia visual. El dropdown usa `position: absolute` sobre un wrapper `relative`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Debounce, onSelect callback, no llamada con < 3 chars | Jest + mock de fetch |
| Unit | Keyboard nav (↑↓ Enter Esc) | Jest + fireEvent |
| Integration | Que `/events/new` envía coords al mutar | Mock de `useCreateEvent`, verificar payload |
| E2E | N/A en MVP | Diferido |

## Migration / Rollout

No migration required. Las columnas `destLat`, `destLng`, `originLat`, `originLng`, `startLat`, `startLng`, `pickupLat`, `pickupLng` ya existen en el schema. Los campos son opcionales — registros existentes sin coords no se ven afectados.

## Open Questions

- [ ] ¿Queremos filtrar por ciudad/región además de país? (ej. `viewbox` de Bogotá) — diferido, se puede agregar como prop
