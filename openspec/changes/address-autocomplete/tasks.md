# Tasks: Address Autocomplete with Geocoding

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250–310 (1 new file ~120 lines, 2 modified ~130–190 lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | AddressAutocomplete component + integrations | Single PR | Tests incluidos |

---

## Phase 1: Foundation — Componente AddressAutocomplete

- [x] 1.1 Crear `frontend/src/components/ui/AddressAutocomplete.tsx` con el tipo `AddressAutocompleteProps` y `AddressSuggestion` definidos en el design
- [x] 1.2 Implementar fetch a Nominatim con debounce configurable (default 400 ms), mínimo 3 caracteres, y header `User-Agent: RideFlow/1.0`
- [x] 1.3 Renderizar dropdown con hasta 5 sugerencias; mostrar "No se encontraron resultados" cuando el array está vacío
- [x] 1.4 Al seleccionar una sugerencia: llenar el input, cerrar el dropdown, y llamar `onSelect({ address, lat: parseFloat(lat), lng: parseFloat(lon) })`
- [x] 1.5 Implementar navegación por teclado: ↑↓ para moverse, Enter para seleccionar, Escape para cerrar
- [x] 1.6 Aplicar los mismos estilos base del `<Input>` existente al campo de texto; el dropdown con `absolute z-50 bg-surface border rounded-md shadow-lg`

## Phase 2: Integración — /events/new

- [x] 2.1 En `frontend/src/app/(dashboard)/events/new/page.tsx`: agregar estados `originLat`, `originLng`, `destLat`, `destLng` (todos `number | null`)
- [x] 2.2 Reemplazar el `<Input>` del campo `destination` por `<AddressAutocomplete>` con `onSelect` que setea `destination`, `destLat`, `destLng`
- [x] 2.3 Agregar campo `origin` (actualmente no existe en el form) usando `<AddressAutocomplete>` con `onSelect` que setea `origin`, `originLat`, `originLng`
- [x] 2.4 En `handleSubmit`: incluir `originLat`, `originLng`, `destLat`, `destLng` en el payload de `createEvent.mutateAsync()`

## Phase 3: Integración — /invite/[token]

- [x] 3.1 En `frontend/src/app/invite/[token]/page.tsx`, driver-form: reemplazar `<Input>` de `startLocation` por `<AddressAutocomplete>` con `onSelect` que setea `startLocation`, `startLat`, `startLng`
- [x] 3.2 Passenger-form: reemplazar el `<Input>` de `pickupAddress` y los dos inputs manuales de lat/lng por un único `<AddressAutocomplete>` con `onSelect` que setea `pickupAddress`, `pickupLat`, `pickupLng`
- [x] 3.3 Eliminar la sección "Coordenadas (opcional)" de lat/lng manuales del passenger-form

## Phase 4: Tests

- [x] 4.1 Unit test: verificar que no se hace fetch con menos de 3 caracteres (ref. spec Scenario: User types fewer than 3 characters)
- [x] 4.2 Unit test: verificar que `onSelect` recibe `{ address, lat: number, lng: number }` al seleccionar sugerencia (ref. spec Scenario: User selects a suggestion)
- [x] 4.3 Unit test: verificar que Escape cierra el dropdown sin llamar `onSelect` (ref. spec Scenario: Escape key closes dropdown)
- [x] 4.4 Unit test: verificar que un error de red no lanza excepción al componente padre (ref. spec Scenario: Network error during search)
