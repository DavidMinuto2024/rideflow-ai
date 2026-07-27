# Flujos Actuales por Rol — RideFlow AI

> ℹ️ **Nota**: la app tiene roles por organización. Un usuario puede tener distinto rol en cada org.

---

## Mapa General de la Aplicación

```mermaid
flowchart TD
    subgraph Auth["🔐 Auth & Landing"]
        LANDING["/ — Landing Page"] --> LOGIN["/login"]
        LANDING --> SIGNUP["/signup"]
        LOGIN --> DASHBOARD["/dashboard"]
        SIGNUP --> DASHBOARD
        DASHBOASH -->|redirect si no auth| LOGIN
    end

    subgraph Public["📱 Público (sin auth)"]
        INVITE["/invite/:token"] -->|redirect a login| LOGIN
        LOGIN -->|vuelve con redirect| INVITE
    end

    subgraph OrgMgmt["🏢 Gestión de Organizaciones"]
        ORGS["/organizations"] --> ORG_DETAIL["/orgs/:id"]
        ORG_DETAIL --> ORG_MEMBERS["/orgs/:id/members"]
        ORG_DETAIL --> ORG_EDIT["Editar org"]
    end

    subgraph Events["📅 Gestión de Eventos"]
        EVENTS["/events"] --> NEW_EVENT["/events/new"]
        EVENTS --> EVENT_DETAIL["/events/:id"]
        EVENT_DETAIL --> STATUS_TRANSITION["Cambiar estado"]
        EVENT_DETAIL --> EVENT_TRIPS["/events/:id/trips"]
        EVENT_DETAIL --> EVENT_REQUESTS["/events/:id/requests"]
        EVENT_DETAIL --> EVENT_REQUEST["/events/:id/request"]
        EVENT_DETAIL --> EVENT_QR["/events/:id/qr"]
        EVENT_TRIPS --> TRIP_DETAIL["/events/:id/trips/:tripId"]
    end

    subgraph Vehicles["🚗 Gestión de Vehículos"]
        VEHICLES["/vehicles"] --> NEW_VEHICLE["/vehicles/new"]
        VEHICLES --> VEHICLE_DETAIL["/vehicles/:id"]
    end

    subgraph Notif["🔔 Notificaciones"]
        NOTIFS["/notificaciones"]
    end

    subgraph InviteFlow["📲 Flujo Invitación QR"]
        INVITE_LANDING["/invite/:token"] --> ROLE_SELECT["Elegir rol"]
        ROLE_SELECT --> DRIVER_FORM["Formulario Conductor"]
        ROLE_SELECT --> PASSENGER_FORM["Formulario Pasajero"]
        DRIVER_FORM -->|POST /invite/:token/join| JOIN_SUCCESS["✅ Unido al evento"]
        PASSENGER_FORM --> JOIN_SUCCESS
    end

    LANDING --> ORGS
    DASHBOARD --> ORGS
    DASHBOARD --> EVENTS
    DASHBOARD --> VEHICLES
    DASHBOARD --> NOTIFS
```

---

## 1. SUPER_ADMIN (Administrador Global)

### Lo que PUEDE hacer (implementado)

| Flujo | ¿Funciona? | Ruta |
|-------|-----------|------|
| Ver dashboard con KPIs globales | ✅ | `GET /dashboard/stats` |
| CRUD organizaciones | ✅ (crear, editar) | `POST/PATCH /organizations/:id` |
| Eliminar organización | ✅ (solo SUPER_ADMIN) | `DELETE /organizations/:id` |
| Ver miembros de org + cambiar roles | ✅ | `PATCH /orgs/:orgId/users/:userId/role` |
| CRUD vehículos en cualquier org | ✅ | `POST/PATCH/DELETE /vehicles` |
| CRUD eventos + transiciones de estado | ✅ | `POST/PATCH /events/:id/status` |
| Cambiar estado de solicitudes de viaje | ✅ | `PATCH /requests/:id` |
| Auto-asignar pasajeros a conductores | ✅ | `POST /events/:eventId/assign` |
| Asignación directa (backend) | ✅ Backend / ❌ Sin UI | `POST /events/:eventId/direct-assign` |
| Ver mapa con rutas Leaflet + OSRM | ✅ | `/events/:id/trips/:tripId` |

### Lo que NO está implementado

| Carencia | Detalle |
|----------|---------|
| **Panel de Super Admin** | No existe una vista global de todas las organizaciones, usuarios, o actividad del sistema |
| **Gestión de usuarios** | No hay forma de listar/editar/desactivar usuarios desde la UI |
| **Solo existe como rol en BD** | El enum `SUPER_ADMIN` está, pero no hay UI diferenciada |

### Diagrama de flujo SUPER_ADMIN

```mermaid
flowchart TD
    LOGIN["Login (email/password o Google)"] --> AUTH{¿Auth OK?}
    AUTH -->|Sí| COOKIE["Set cookie rideflow-auth"]
    COOKIE --> DASHBOARD["/dashboard — KPIs globales"]
    
    DASHBOARD --> ORGS["Ver organizaciones"]
    ORGS --> CRUD_ORG["Crear / Editar / Eliminar org"]
    CRUD_ORG --> VER_ORG["Detalle org: eventos + vehículos + miembros"]
    VER_ORG --> MEMBERS["Ver miembros"]
    MEMBERS --> CHANGE_ROLE["Cambiar rol de miembro"]

    DASHBOARD --> EVENTS["Listar eventos"]
    EVENTS --> CREATE_EVENT["Crear evento en org"]
    EVENTS --> EVENT_DETAIL["Ver detalle evento"]
    EVENT_DETAIL --> STATUS["DRAFT → PUBLISHED → OPEN → CLOSED → FINISHED"]
    EVENT_DETAIL --> TRIPS["Ver viajes"]
    EVENT_DETAIL --> REQUESTS["Ver solicitudes de viaje"]
    REQUESTS --> APPROVE_REJECT["Aprobar / Rechazar solicitud"]
    REQUESTS --> AUTO_ASSIGN["Auto-asignar (greedy)"]
    
    DASHBOARD --> VEHICLES["Ver vehículos"]
    VEHICLES --> CRUD_VEHICLE["Crear / Editar / Desactivar vehículo"]
```

---

## 2. ORG_ADMIN (Administrador de Organización)

### Lo que PUEDE hacer (implementado)

| Flujo | ¿Funciona? | Permiso |
|-------|-----------|---------|
| Ver dashboard | ✅ | Auth |
| CRUD organización (editar nombre) | ✅ | `@Roles(SUPER_ADMIN, ORG_ADMIN)` en controller |
| CRUD eventos | ✅ | `@Roles(ORG_ADMIN, DRIVER, PASSENGER)` crear |
| Avanzar estado del evento | ✅ | `@Roles(ORG_ADMIN, DRIVER)` |
| Eliminar evento | ✅ (solo ORG_ADMIN) | `@Roles(ORG_ADMIN)` |
| CRUD vehículos de la org | ✅ | `@Roles(SUPER_ADMIN, ORG_ADMIN)` |
| Cambiar rol de miembros | ✅ (sin guard, check manual) | `PATCH .../users/:userId/role` |
| Ver solicitudes de viaje + gestionar | ✅ | `ALLOWED_ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'DRIVER']` |
| Auto-asignar pasajeros | ✅ | `@Roles(ORG_ADMIN, DRIVER)` |
| Asignación directa (backend) | ✅ Backend / ❌ Sin UI | `POST direct-assign` |
| Registrar vehículo en evento | ✅ | `@Roles(DRIVER, ORG_ADMIN)` |
| Ver QR + compartir invitación | ✅ | Auth |
| Ver notificaciones | ✅ | Auth |
| Ver mapa del viaje con ruta | ✅ | Auth |

### Diagrama de flujo ORG_ADMIN

```mermaid
flowchart TD
    DASH["/dashboard"] --> ORGS["Mis organizaciones"]
    ORGS --> ORG["Ver org: miembros, eventos, vehículos"]
    ORG --> MEMBERS["Gestionar miembros"]
    MEMBERS --> ROLE_CHANGE["Cambiar rol: PASSENGER ↔ DRIVER ↔ ORG_ADMIN"]
    
    ORG --> NEW_EVENT["Crear evento (DRAFT)"]
    NEW_EVENT --> EVENT_DETAIL["Detalle del evento"]
    
    EVENT_DETAIL --> TRANSITION{"Transición de estado"}
    TRANSITION --> DRAFT["DRAFT"]
    TRANSITION --> PUBLISHED["PUBLISHED"]
    TRANSITION --> OPEN["OPEN — acepta solicitudes"]
    TRANSITION --> CLOSED["CLOSED — cierra solicitudes"]
    TRANSITION --> FINISHED["FINISHED"]

    EVENT_DETAIL --> QR["Compartir QR / link de invitación"]
    
    EVENT_DETAIL --> REQUESTS["Ver solicitudes (PENDING)"]
    REQUESTS --> APPROVE["Aprobar → ACCEPTED"]
    REQUESTS --> REJECT["Rechazar → REJECTED"]
    REQUESTS --> AUTO_ASSIGN["Auto-asignar todos los PENDING"]
    AUTO_ASSIGN --> TRIPS["Viajes creados con pasajeros asignados"]
    
    EVENT_DETAIL --> TRIPS["Ver viajes"]
    TRIPS --> TRIP_DETAIL["Detalle viaje: conductor + vehículo + pasajeros + mapa + ruta"]
    TRIP_DETAIL --> NAV["Abrir en Waze / Google Maps"]
    
    ORG --> NEW_VEHICLE["Registrar vehículo (placa, modelo, capacidad)"]
    ORG --> ASSIGN_VEHICLE["Asignar vehículo a conductor"]
```

---

## 3. DRIVER (Conductor)

### Lo que PUEDE hacer (implementado)

| Flujo | ¿Funciona? | Permiso |
|-------|-----------|---------|
| Ver dashboard | ✅ | Auth |
| Unirse a evento vía QR como conductor | ✅ | `POST /invite/:token/join` |
| Seleccionar vehículo existente o crear nuevo | ✅ | Formulario en `/invite/:token` |
| Registrar vehículo en evento | ✅ | `@Roles(DRIVER, ORG_ADMIN)` |
| Ver pico y placa (badge) | ✅ | Se calcula al unirse |
| Crear eventos | ✅ | `@Roles(ORG_ADMIN, DRIVER, PASSENGER)` |
| Avanzar estado del evento | ✅ | `@Roles(ORG_ADMIN, DRIVER)` |
| Aprobar/rechazar solicitudes de viaje | ✅ | `ALLOWED_ROLES` incluye DRIVER |
| Auto-asignar pasajeros | ✅ | `@Roles(ORG_ADMIN, DRIVER)` |
| Ver viajes asignados | ✅ | `GET /events/:id/trips` |
| Ver detalle del viaje con mapa | ✅ | `/events/:id/trips/:tripId` |
| Editar info de evento | ✅ | `@Roles(ORG_ADMIN, DRIVER)` |
| Ver notificaciones | ✅ | Auth |

### Lo que NO está implementado

| Carencia | Detalle |
|----------|---------|
| **Dashboard de conductor** | No hay vista que muestre "mis viajes asignados", "mis pasajeros", "mi ruta del día" |
| **Vista de ruta optimizada** | El OSRM calcula la ruta pero no hay "ver mi ruta completa con paradas" desde la perspectiva del conductor |
| **Check-in de pasajeros** | No hay flujo de "recogí al pasajero X" |
| **Llegada a destino** | No hay marcación de "llegué al evento" |

### Diagrama de flujo DRIVER

```mermaid
flowchart TD
    subgraph JoinFlow["Unirse como Conductor"]
        QR["Escanea QR o recibe link /invite/:token"] --> ROLE_SEL["Elige: Conductor"]
        ROLE_SEL --> SELECT_VEHICLE{"¿Tiene vehículo?"}
        SELECT_VEHICLE -->|Sí| EXISTING["Selecciona vehículo existente"]
        SELECT_VEHICLE -->|No| NEW_VEHICLE_FORM["Registrar vehículo nuevo:
        placa, modelo, capacidad"]
        EXISTING --> FORM_DRIVER["Ingresa dirección de salida"]
        NEW_VEHICLE_FORM --> FORM_DRIVER
        FORM_DRIVER --> POST_JOIN["POST /invite/:token/join { role: DRIVER, vehicleId, startLocation }"]
        POST_JOIN --> PICO_CHECK{"¿Pico y placa?"}
        PICO_CHECK -->|Sí| PICO_WARN["⚠️ Badge: Pico y placa activo"]
        PICO_CHECK -->|No| OK["✅ EventVehicle creado"]
        OK --> NOTIFY_ADMIN["Notificación a admins de la org"]
        OK --> EVENT_DETAIL["Redirigido al evento"]
    end

    subgraph DriverEventFlow["En el Evento"]
        EVENT_DETAIL --> CHECK_REQUESTS["Ver solicitudes pendientes"]
        CHECK_REQUESTS --> APPROVE_REJECT["Aprobar / Rechazar pasajeros"]
        CHECK_REQUESTS --> AUTO_ASSIGN["Auto-asignar pasajeros pendientes"]
        AUTO_ASSIGN --> TRIPS["Viaje creado con:
        - Origen: dirección del conductor
        - Destino: evento
        - Pasajeros asignados"]
        
        TRIPS --> TRIP_DETAIL["Ver detalle del viaje"]
        TRIP_DETAIL --> MAP["Mapa con ruta OSRM"]
        TRIP_DETAIL --> NAV["Abrir en Waze / Google Maps"]
        TRIP_DETAIL --> PASSENGERS["Lista de pasajeros + pickup estimado"]
    end
    
    subgraph DriverStatusFlow["Avanzar Evento"]
        EVENT_DETAIL --> TRANSITION["Cambiar estado:
        DRAFT → PUBLISHED → OPEN → CLOSED → FINISHED"]
    end
```

---

## 4. PASSENGER (Pasajero)

### Lo que PUEDE hacer (implementado)

| Flujo | ¿Funciona? | Permiso |
|-------|-----------|---------|
| Ver dashboard | ✅ | Auth |
| Unirse a evento vía QR como pasajero | ✅ | `POST /invite/:token/join` |
| Solicitar viaje desde evento (OPEN) | ✅ | `POST /events/:eventId/requests` |
| Ver estado de su solicitud | ✅ | `GET /events/:id/requests` |
| Ver viajes del evento | ✅ | `GET /events/:id/trips` |
| Ver detalle de un viaje (mapa + ruta) | ✅ | Auth |
| Crear eventos | ✅ | `@Roles(ORG_ADMIN, DRIVER, PASSENGER)` |
| Recibir notificaciones de aprobación/rechazo | ✅ | Notificaciones in-app |

### Lo que NO está implementado

| Carencia | Detalle |
|----------|---------|
| **Dashboard de pasajero** | No hay vista tipo "mis viajes" o "mis solicitudes" personales |
| **Cancelar mi solicitud** | El endpoint `PATCH /requests/:id` acepta CANCELLED pero no hay botón de cancelar en la UI para el pasajero |
| **Ver mi viaje asignado** | No hay página consolidada de "mi viaje" para el pasajero, solo desde el listado de viajes del evento |
| **Pickup estimado** | Se calcula pero no hay vista tipo "mi conductor llega a las X" para el pasajero |

### Diagrama de flujo PASSENGER

```mermaid
flowchart TD
    subgraph JoinAsPassenger["Unirse como Pasajero"]
        QR["Escanea QR /invite/:token"] --> ROLE_SEL["Elige: Pasajero"]
        ROLE_SEL --> FORM["Ingresa:
        - Dirección de recogida
        - Coordenadas (opcional)"]
        FORM --> POST_JOIN["POST /invite/:token/join { role: PASSENGER, pickupAddress }"]
        POST_JOIN --> CHECK_CAP{"¿Capacidad disponible?"}
        CHECK_CAP -->|Sí| RIDE_REQ["✅ RideRequest creado (PENDING)"]
        CHECK_CAP -->|No| CAP_ERROR["❌ Evento lleno"]
        RIDE_REQ --> NOTIFY_ADMIN["Notificación a admins"]
    end

    subgraph PassengerAlternate["Alternativa: Solicitar desde evento"]
        EVENT_OPEN["Evento en estado OPEN"] --> REQ_BTN["Botón 'Solicitar viaje'"]
        REQ_BTN --> FORM2["Formulario de solicitud"]
        FORM2 --> POST_REQ["POST /events/:eventId/requests"]
        POST_REQ --> RIDE_REQ
    end

    subgraph PassengerAfter["Después de la solicitud"]
        RIDE_REQ --> WAIT["Esperar aprobación..."]
        WAIT -->|Admin/Driver aprueba| ACCEPTED["ACCEPTED — asignado a un viaje"]
        WAIT -->|Admin/Driver rechaza| REJECTED["REJECTED"]
        ACCEPTED --> NOTIF["Recibe notificación in-app"]
        NOTIF --> VIEW_TRIPS["Ver viajes del evento"]
        VIEW_TRIPS --> MY_TRIP["Ver detalle del viaje:
        - Conductor asignado
        - Vehículo
        - Mapa de ruta
        - Hora pickup estimada"]
        MY_TRIP --> NAV["Abrir en Waze / Google Maps"]
    end
```

---

## 5. Iniciar Sesión en el Sistema

```mermaid
flowchart TD
    START["Usuario visita cualquier página protegida"] --> MIDDLEWARE{¿Cookie rideflow-auth?}
    MIDDLEWARE -->|No| LOGIN["Redirect a /login?redirect=..."]
    MIDDLEWARE -->|Sí| PAGE["✅ Página solicitada"]
    
    LOGIN --> METHOD{"¿Cómo se autentica?"}
    METHOD -->|Email + password| EMAIL_LOGIN["POST /auth/login"]
    METHOD -->|Google OAuth| GOOGLE["Supabase Google OAuth"]
    
    EMAIL_LOGIN --> SUPABASE["Supabase Auth verifica JWT"]
    SUPABASE --> COOKIE["Set cookie rideflow-auth=true"]
    COOKIE --> REDIRECT["Redirect a página solicitada"]
    
    GOOGLE --> CALLBACK["/auth/callback"]
    CALLBACK --> COOKIE
    
    SUB_SIGNUP["/signup"] --> REGISTER["POST /auth/signup"]
    REGISTER --> SUPABASE_CREATE["Crear en Supabase Auth + tabla users"]
    SUPABASE_CREATE --> LOGIN
    
    LOGOUT["Cerrar sesión"] --> CLEAR["Limpia cookie + Supabase signOut"]
    CLEAR --> LOGIN
```

---

## 6. Evento — Máquina de Estados

```mermaid
flowchart LR
    DRAFT["📄 DRAFT"] -->|ORG_ADMIN/DRIVER| PUBLISHED["📢 PUBLISHED"]
    PUBLISHED -->|ORG_ADMIN/DRIVER| OPEN["✅ OPEN"]
    OPEN -->|ORG_ADMIN/DRIVER| CLOSED["🔒 CLOSED"]
    CLOSED -->|ORG_ADMIN/DRIVER| FINISHED["🏁 FINISHED"]
    
    DRAFT -.->|Editable| DRAFT
    PUBLISHED -.->|Editable| PUBLISHED
    
    DRAFT -->|ORG_ADMIN| DELETE["🗑️ Eliminar"]
```

### Reglas de cada estado

| Estado | Solicita viajes | Se puede editar | Se puede eliminar |
|--------|----------------|----------------|-------------------|
| DRAFT | ❌ | ✅ | ✅ |
| PUBLISHED | ❌ | ✅ | ❌ |
| OPEN | ✅ | ❌ | ❌ |
| CLOSED | ❌ | ❌ | ❌ |
| FINISHED | ❌ | ❌ | ❌ |

---

## 7. Auto-Asignación (Assignment Engine)

```mermaid
flowchart TD
    TRIGGER["ORG_ADMIN o DRIVER hace clic en 'Asignar automáticamente'"] --> FETCH_REQUESTS["Obtener ride_requests PENDING"]
    FETCH_REQUESTS --> CHECK_EMPTY{"¿Hay solicitudes pendientes?"}
    CHECK_EMPTY -->|No| DONE["✅ No hay nada que asignar"]
    CHECK_EMPTY -->|Sí| FETCH_VEHICLES["Obtener vehículos activos con conductor asignado"]
    FETCH_VEHICLES --> CHECK_VEHICLES{"¿Hay vehículos disponibles?"}
    CHECK_VEHICLES -->|No| ERROR["❌ Error: No hay vehículos con conductores"]
    CHECK_VEHICLES -->|Sí| CHECK_CAP{"Calcular capacidad restante"}
    CHECK_CAP --> GREEDY["Algoritmo greedy:
    1. Ordenar vehículos por capacidad DESC
    2. Por cada vehículo, crear un Trip
    3. Asignar pasajeros hasta llenar vehículo
    4. Marcar RideRequests como ACCEPTED
    5. Crear PassengerAssignments"]
    GREEDY --> NOTIFICATIONS["Enviar notificación TRIP_ASSIGNED a cada pasajero"]
    NOTIFICATIONS --> RESULT["✅ N pasajeros asignados en M viajes"]
```

---

## 8. Flujo de Viaje Completo (Extremo a Extremo)

```mermaid
flowchart TD
    subgraph Setup["Setup"]
        A1["ORG_ADMIN crea organización"] --> A2["Invita miembros (por ahora manual en DB)"]
        A2 --> A3["ORG_ADMIN/DRIVER registra vehículos"]
        A3 --> A4["Asigna vehículos a conductores (driverId)"]
    end

    subgraph EventLifecycle["Ciclo de Vida del Evento"]
        B1["Cualquier miembro crea evento (DRAFT)"] --> B2["ORG_ADMIN/DRIVER cambia a PUBLISHED"]
        B2 --> B3["ORG_ADMIN/DRIVER cambia a OPEN"]
        
        B3 --> C1["Pasajeros se unen vía QR → RideRequests PENDING"]
        B3 --> C2["Conductores se unen vía QR → EventVehicles"]
        
        C1 --> D1["ORG_ADMIN/DRIVER auto-asigna o manual"]
        D1 --> E1["Trips creados con pasajeros asignados"]
        E1 --> E2["ORG_ADMIN/DRIVER cambia a CLOSED"]
        E2 --> E3["ORG_ADMIN/DRIVER cambia a FINISHED"]
    end

    subgraph PostEvent["Post-Evento"]
        F1["Notificaciones enviadas"]
        F2["Pasajeros ven su viaje asignado con mapa y ruta"]
        F3["Conductores ven sus pasajeros asignados"]
        F4["Todos pueden abrir en Waze/Google Maps"]
    end
    
    Setup --> EventLifecycle
    EventLifecycle --> PostEvent
```

---

## 9. Resumen de Flujos que NO HACEN NADA o son Parciales

| Flujo | Estado | Por qué no funciona |
|-------|--------|-------------------|
| **Panel Super Admin** | ❌ No existe | No hay UI para rol SUPER_ADMIN |
| **Asignación directa** | ⚠️ Backend sí / UI no | `POST direct-assign` funciona, pero no hay botón en frontend para usarlo |
| **Optimizar tiempos (OSRM)** | ⚠️ Backend sí / UI no | Se llama automáticamente al cancelar, pero no hay botón manual en UI |
| **Sugerencias de conductores** | ⚠️ API sí / UI no | `GET /events/:id/suggestions` existe pero no hay página que las muestre |
| **Pico y placa** | ⚠️ Parcial | Se calcula al registrarse pero no hay advertencia visible ni enforcement |
| **Dashboard de conductor** | ❌ No existe | No hay vista consolidada de "mis viajes como conductor" |
| **Dashboard de pasajero** | ❌ No existe | No hay vista consolidada de "mis viajes como pasajero" |
| **Cancelar solicitud (pasajero)** | ⚠️ Backend sí / UI no | El endpoint acepta CANCELLED pero no hay botón en UI para el pasajero |
| **Editar evento (PATCH)** | ⚠️ Backend sí / UI no | El endpoint existe pero la página de evento no tiene formulario de edición |
| **Hora de llegada (arrivalTime)** | ⚠️ Parcial | El campo existe en BD y se muestra si está seteado, pero el formulario de crear evento no tiene el input |
| **Notificaciones push/email** | ❌ No existe | Solo hay notificaciones in-app, no hay integración con email o push |
| **Sidebar por rol** | ❌ No existe | Todos los usuarios autenticados ven el mismo menú lateral |
