# Design: Refactored Event Creation and Interactive Map Flow

## Technical Approach

1. **`AddressAutocomplete`**: Añadir prop `requireSelection?: boolean`. Si el usuario escribe texto y cambia el input pero no ha seleccionado una opción de Nominatim, el estado de coordenadas es `null` y el componente expone `error="Debes seleccionar una opción de la lista"`.
2. **Componente de Mapa en Tiempo Real**: En `/events/new`, mantener un componente `<MapView>` dinámico al lado o debajo del formulario. Los cambios en los estados `destLat`/`destLng` y `startLat`/`startLng` o `pickupLat`/`pickupLng` se pasan directamente como props a `<MapView>` para renderizar pines instantáneamente.
3. **Flujo de Formulario de Creación Simplificado (`/events/new`)**:
   - Reestructurar la página en un Stepper o formulario articulado en 2 pasos:
     - **Paso 1: Datos del Evento**: Organización, Título, Destino (`AddressAutocomplete`), Fecha y Hora de Llegada (`arrivalTime`).
     - **Paso 2: ¿Cómo vas a asistir?**: Botones interactivos "Voy a manejar (Conductor)" vs "Necesito transporte (Pasajero)".
       - Si Conductor: Muestra selector de Vehículo (o form para nuevo vehículo) + `AddressAutocomplete` de "Punto de salida".
       - Si Pasajero: Muestra `AddressAutocomplete` de "Punto de recogida".
   - Al hacer submit:
     - Crea el evento vía `useCreateEvent`.
     - Inmediatamente registra el vehículo vía `useRegisterEventVehicle` (si es conductor) o crea la solicitud vía `useCreateRequest` (si es pasajero).
     - Redirige a `/events/[id]`.

## Data Flow

```
[Form P1: Destino] ──onSelect──► destLat, destLng ──────┐
                                                       ▼
[Form P2: Rol]     ──onSelect──► start/pickup Lat,Lng ─┼─► <MapView live preview>
                                                       │
[Submit] ──────────────────────────────────────────────┘
   │
   ├── 1. POST /organizations/:id/events (Create Event with dest coordinates)
   └── 2. IF Driver: POST /events/:id/event-vehicles (Register Driver with start coordinates)
          IF Passenger: POST /events/:id/requests (Create Passenger Request with pickup coordinates)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `frontend/src/components/ui/AddressAutocomplete.tsx` | Modify | Validación de selección obligatoria y aviso si hay texto no geocodificado |
| `frontend/src/app/(dashboard)/events/new/page.tsx` | Modify | Formulario simplificado en 2 pasos con integración de mapa en vivo |
| `frontend/src/components/MapView.tsx` | Modify | Mejorar comportamiento de auto-centrado cuando cambian los marcadores dinámicamente |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | AddressAutocomplete requiere selección | Test en Vitest probando que sin clic en sugerencia no hay coordenadas |
| Integration | Creación de evento con rol de conductor | Test de integración en `/events/new` |
| Integration | Creación de evento con rol de pasajero | Test de integración en `/events/new` |
