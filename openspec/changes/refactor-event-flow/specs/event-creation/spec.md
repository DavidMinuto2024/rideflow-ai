# Event Creation and Registration Flow Specification

## Purpose

Establecer los requisitos para la creación simplificada de eventos, validación estricta de direcciones con coordenadas y la inscripción inmediata del creador con vista previa en tiempo real en el mapa.

## Requirements

### Requirement: Strict Address Geocoding Validation

Todos los campos de dirección en formularios de eventos e invitaciones MUST exigir que el usuario seleccione una sugerencia válida con coordenadas `lat` y `lng`.

Si el usuario ingresa texto sin seleccionar una sugerencia del menú desplegable, el componente MUST marcar el campo como inválido y el formulario MUST NOT permitir el envío.

#### Scenario: User types address without selecting from dropdown
- GIVEN el usuario escribe una dirección en el campo de autocompletado
- WHEN el usuario no hace clic ni presiona Enter en una sugerencia desplegable
- THEN el campo muestra un mensaje "Debes seleccionar una dirección válida de la lista"
- AND el botón de envío permanece deshabilitado o muestra error al hacer clic

#### Scenario: User selects a valid suggestion
- GIVEN el usuario escribe en el campo y aparece la lista de sugerencias
- WHEN el usuario selecciona una opción
- THEN el campo queda marcado como válido
- AND se guardan las coordenadas `lat` y `lng`

---

### Requirement: Simplified Event Creation Inputs

El formulario de creación de eventos (`/events/new`) MUST solicitar únicamente:
1. Organización
2. Título del evento
3. Destino (con autocompletado estricto)
4. Fecha y Hora de Llegada al Destino (`arrivalTime`)
5. Capacidad (opcional, por defecto 4)
6. Descripción (opcional)

El formulario MUST NOT solicitar la dirección de origen del evento en este paso inicial.

#### Scenario: Creator fills initial event details
- GIVEN el creador está en `/events/new`
- WHEN completa Título, Organización, Destino y Hora de llegada
- THEN puede avanzar al siguiente paso de selección de rol (Conductor / Pasajero)

---

### Requirement: Immediate Creator Role Registration

Inmediatamente al definir los datos del evento, el formulario MUST solicitar al creador definir su rol en el viaje:
- **Conductor (Auto)**: Debe seleccionar o registrar su vehículo y proporcionar su dirección de salida (`startLocation` obligatoria con autocompletado).
- **Pasajero**: Debe proporcionar su dirección de recogida (`pickupAddress` obligatoria con autocompletado).

#### Scenario: Creator registers as Driver
- GIVEN el creador seleccionó la opción "Conductor (Auto)"
- WHEN elige un vehículo e ingresa su punto de salida
- THEN al enviar se crea el evento y automáticamente se registra el vehículo/conductor en dicho evento

#### Scenario: Creator registers as Passenger
- GIVEN el creador seleccionó la opción "Pasajero"
- WHEN ingresa su dirección de recogida
- THEN al enviar se crea el evento y automáticamente se genera la solicitud de viaje como pasajero

---

### Requirement: Live Interactive Map Preview

El formulario de creación MUST incluir un mapa dinámico en tiempo real (`MapView`).

El mapa MUST actualizarse inmediatamente tan pronto como el usuario seleccione una dirección geocodificada:
- Al seleccionar el **Destino**: se dibuja de inmediato el pin de Destino en el mapa.
- Al seleccionar el **Punto de salida (Conductor)** o **Punto de recogida (Pasajero)**: se dibuja el pin correspondiente y se ajustan los límites del mapa (`bounds`) para mostrar ambos puntos.

#### Scenario: Live map updates on Destination selection
- GIVEN el creador selecciona una dirección de Destino válida
- WHEN la opción es seleccionada
- THEN el mapa centrará y mostrará inmediatamente el marcador del Destino en las coordenadas recibidas

#### Scenario: Live map updates on Driver origin selection
- GIVEN el marcador de Destino ya está en el mapa
- WHEN el conductor selecciona su punto de salida
- THEN el mapa muestra ambos pines y la línea/ruta que los conecta
