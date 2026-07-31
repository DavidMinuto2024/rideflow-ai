# Proposal: Refactor Event Creation & Registration Flow

## Intent

El flujo actual de creación de eventos e inscripción es confuso y no garantiza coordenadas ni mapas interactivos:
1. Permite guardar texto libre sin coordenadas, rompiendo la representación en el mapa.
2. Pide campos innecesarios al crear un evento (como el origen del evento).
3. No inscribe al creador automáticamente según su rol (Conductor vs Pasajero).
4. No ofrece vista previa en vivo del mapa al seleccionar direcciones.

## Scope

### In Scope
- **Validación Estricta de Dirección**: Forzar selección de sugerencia geocodificada en `AddressAutocomplete` (no permite texto libre desasociado de coordenadas).
- **Formulario de Creación Simplificado (`/events/new`)**:
  - Pide únicamente: Título, Organización, Destino (autocomplete obligatorio), Fecha y Hora de Llegada (`arrivalTime`), Capacidad y Descripción.
  - Vista previa en tiempo real del mapa mostrando el marcador de Destino tan pronto como se selecciona.
- **Paso de Registro del Creador (Paso 2 / Sub-form)**:
  - Preguntar al creador si asistirá como **Conductor (Auto)** o **Pasajero**.
  - Si es Conductor: Seleccionar/Registrar vehículo y Dirección de salida (`startLocation` autocomplete obligatorio) + Vista previa en el mapa.
  - Si es Pasajero: Dirección de recogida (`pickupAddress` autocomplete obligatorio) + Vista previa en el mapa.
- **Visualización en Mapa (`MapView`)**: Actualizar la visualización para reflejar destino, punto de salida y puntos de recogida en tiempo real.

### Out of Scope
- Modificaciones al esquema de base de datos de Prisma (los campos existentes `originLat`, `destLat`, `startLat`, `pickupLat` soportan completamente este flujo).

## Capabilities

### New Capabilities
- `strict-address-validation`: `AddressAutocomplete` exige selección obligatoria para garantizar coordenadas antes de enviar cualquier formulario.
- `interactive-map-preview`: Componente de mapa en vivo que reacciona instantáneamente a las direcciones seleccionadas en formularios.

### Modified Capabilities
- `event-creation`: Flujo enfocado en Destino + Fecha/Hora de llegada + selección de rol e inscripción del creador (Conductor/Pasajero) con coordenadas.

## Approach

1. Modificar `AddressAutocomplete` para agregar una prop `requireCoordinates?: boolean` (o forzar estado `isValid` si no hay `lat/lng`). Si el usuario escribe sin seleccionar, el campo marca error y bloquea la presentación.
2. Refactorizar `/events/new` con un stepper o formulario de dos pasos:
   - **Paso 1: Datos del Evento**: Título, Org, Destino (autocomplete), Fecha/Hora de llegada. Incluye `<MapView>` interactivo al lado/debajo que muestra el pin de Destino tan pronto como se elige.
   - **Paso 2: Rol del Creador**: Opciones "Voy a manejar (Conductor)" o "Necesito transporte (Pasajero)".
     - Conductor: Selecciona vehículo + dirección de salida (`startLocation`). El mapa actualiza la ruta salida → destino.
     - Pasajero: Ingresa punto de recogida (`pickupAddress`). El mapa muestra pin de recogida y destino.
3. Actualizar la mutación de creación/unión para registrar tanto el evento como la participación del creador en la misma experiencia.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src/components/ui/AddressAutocomplete.tsx` | Modified | Validación obligatoria de coordenadas |
| `frontend/src/app/(dashboard)/events/new/page.tsx` | Modified | Reestructuración completa a flujo simplificado + selector de rol del creador + mapa en tiempo real |
| `frontend/src/components/MapView.tsx` | Modified | Soporte para renderizado dinámico responsivo en formularios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El usuario ingresa una dirección muy específica que Nominatim no halla | Med | Permitir reintentar la búsqueda o ajustar el término en Nominatim |
| Creador abandona el paso 2 de rol | Low | Hacer el formulario continuo o guardar ambos pasos en una sola acción |

## Rollback Plan

Revertir los componentes a las versiones anteriores donde el evento y el registro de vehículos/solicitudes se hacían por separado.

## Success Criteria

- [ ] Un formulario de dirección no permite ser enviado si la dirección no tiene `lat`/`lng` asociados.
- [ ] La creación de evento solo requiere Destino + Hora de llegada + Título/Org.
- [ ] Se le pregunta de inmediato al creador si irá en auto o como pasajero.
- [ ] Tan pronto como se selecciona cualquier dirección en el formulario, el mapa muestra el punto/marcador en tiempo real.
