# Tasks: Refactor Event Creation & Registration Flow

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250–320 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

---

## Phase 1: Validaciones de Dirección y Componentes UI

- [x] 1.1 Modificar `frontend/src/components/ui/AddressAutocomplete.tsx` para marcar error si el usuario escribe texto pero no ha seleccionado una opción con coordenadas (`hasValidSelection`).
- [x] 1.2 Actualizar `frontend/src/components/MapView.tsx` para asegurar actualización suave y auto-fit de límites cuando cambian los marcadores en tiempo real.

## Phase 2: Formulario Simplificado y Mapa en Vivo (`/events/new`)

- [x] 2.1 Refactorizar `frontend/src/app/(dashboard)/events/new/page.tsx` para dividir la interfaz en un layout de 2 columnas (Formulario + Mapa interactivo en tiempo real).
- [x] 2.2 Implementar Paso 1: Pedir únicamente Organización, Título, Destino (`AddressAutocomplete` obligatorio), Fecha y Hora de Llegada (`arrivalTime`), Capacidad y Descripción.
- [x] 2.3 Conectar el mapa en vivo en el Paso 1: Apenas se selecciona el Destino, actualizar los props de `MapView` para mostrar el marcador de destino inmediatamente.

## Phase 3: Selección de Rol e Inscripción del Creador

- [x] 3.1 Agregar Paso 2 en el formulario de creación: "¿Cómo vas a asistir?" con tarjetas seleccionables (Conductor vs Pasajero).
- [x] 3.2 Si el creador selecciona **Conductor**: Solicitar vehículo y punto de salida (`startLocation` con `AddressAutocomplete`). Mostrar de inmediato el punto de salida y la ruta en el mapa en vivo.
- [x] 3.3 Si el creador selecciona **Pasajero**: Solicitar punto de recogida (`pickupAddress` con `AddressAutocomplete`). Mostrar de inmediato el punto de recogida en el mapa en vivo.
- [x] 3.4 Actualizar `handleSubmit` para realizar la creación del evento e inmediatamente la mutación correspondiente del rol del creador (`useRegisterEventVehicle` o `useCreateRequest`).

## Phase 4: Pruebas y Verificación

- [x] 4.1 Verificar que no se permite enviar el formulario sin una selección válida de sugerencia de dirección.
- [x] 4.2 Probar la creación de un evento como Conductor verificando que el mapa muestra ambos marcadores y se registra el vehículo.
- [x] 4.3 Probar la creación de un evento como Pasajero verificando que el mapa muestra el punto de recogida y se crea la solicitud.
