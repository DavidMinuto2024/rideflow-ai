-- ═══════════════════════════════════════════════════════════
-- RideFlow AI — Initial database schema (snake_case for PostgREST)
--
-- All table and column names use snake_case to match supabase-js
-- queries. All DDL uses IF [NOT] EXISTS for idempotency.
-- ═══════════════════════════════════════════════════════════

-- ─── Drop PascalCase tables (from Prisma-style migration) ──
-- Reverse dependency order to respect FK constraints

DROP TABLE IF EXISTS "PassengerAssignment" CASCADE;
DROP TABLE IF EXISTS "RideRequest" CASCADE;
DROP TABLE IF EXISTS "Trip" CASCADE;
DROP TABLE IF EXISTS "EventVehicle" CASCADE;
DROP TABLE IF EXISTS "Notification" CASCADE;
DROP TABLE IF EXISTS "Event" CASCADE;
DROP TABLE IF EXISTS "Vehicle" CASCADE;
DROP TABLE IF EXISTS "OrganizationMember" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;
DROP TABLE IF EXISTS "Organization" CASCADE;

-- ─── Enums ────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'DRIVER', 'PASSENGER');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'FINISHED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'RIDE_REQUESTED', 'RIDE_APPROVED', 'RIDE_REJECTED', 'RIDE_CANCELLED',
    'TRIP_ASSIGNED', 'EVENT_REMINDER', 'ESTIMATED_PICKUP_TIME',
    'EVENT_VEHICLE_REGISTERED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── organizations ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    logo        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── users ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    phone       TEXT,
    avatar      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── organization_members ─────────────────────────────────

CREATE TABLE IF NOT EXISTS organization_members (
    id               TEXT         PRIMARY KEY,
    role             "Role"       NOT NULL DEFAULT 'PASSENGER',
    organization_id  TEXT         NOT NULL REFERENCES organizations(id),
    user_id          TEXT         NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- ─── vehicles ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicles (
    id               TEXT         PRIMARY KEY,
    plate            TEXT,
    model            TEXT,
    capacity         INTEGER      NOT NULL DEFAULT 4,
    is_active        BOOLEAN      NOT NULL DEFAULT true,
    organization_id  TEXT         NOT NULL REFERENCES organizations(id),
    driver_id        TEXT         REFERENCES users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── events ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS events (
    id                      TEXT            PRIMARY KEY,
    title                   TEXT            NOT NULL,
    description             TEXT,
    date                    TIMESTAMPTZ     NOT NULL,
    origin                  TEXT            NOT NULL,
    origin_lat              DOUBLE PRECISION,
    origin_lng              DOUBLE PRECISION,
    destination             TEXT            NOT NULL,
    dest_lat                DOUBLE PRECISION,
    dest_lng                DOUBLE PRECISION,
    capacity                INTEGER         NOT NULL DEFAULT 4,
    status                  "EventStatus"   NOT NULL DEFAULT 'DRAFT',
    organization_id         TEXT            NOT NULL REFERENCES organizations(id),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    invite_token            TEXT            UNIQUE,
    invite_token_expires_at TIMESTAMPTZ,
    arrival_time            TIMESTAMPTZ
);

-- ─── event_vehicles ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS event_vehicles (
    id              TEXT         PRIMARY KEY,
    event_id        TEXT         NOT NULL REFERENCES events(id),
    vehicle_id      TEXT         NOT NULL REFERENCES vehicles(id),
    driver_id       TEXT         NOT NULL REFERENCES users(id),
    start_location  TEXT,
    start_lat       DOUBLE PRECISION,
    start_lng       DOUBLE PRECISION,
    pico_y_placa    BOOLEAN      NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE(event_id, vehicle_id)
);

-- ─── trips ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trips (
    id                       TEXT            PRIMARY KEY,
    origin                   TEXT,
    origin_lat               DOUBLE PRECISION,
    origin_lng               DOUBLE PRECISION,
    dest                     TEXT,
    dest_lat                 DOUBLE PRECISION,
    dest_lng                 DOUBLE PRECISION,
    notes                    TEXT,
    distance                 DOUBLE PRECISION,
    duration                 DOUBLE PRECISION,
    route_geometry           TEXT,
    event_id                 TEXT            NOT NULL REFERENCES events(id),
    driver_id                TEXT            NOT NULL REFERENCES users(id),
    vehicle_id               TEXT            REFERENCES vehicles(id),
    estimated_departure_time TIMESTAMPTZ,
    created_at               TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ─── ride_requests ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ride_requests (
    id              TEXT            PRIMARY KEY,
    status          "RequestStatus" NOT NULL DEFAULT 'PENDING',
    trip_id         TEXT            REFERENCES trips(id),
    event_id        TEXT            NOT NULL REFERENCES events(id),
    passenger_id    TEXT            NOT NULL REFERENCES users(id),
    pickup_lat      DOUBLE PRECISION,
    pickup_lng      DOUBLE PRECISION,
    pickup_address  TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE(event_id, passenger_id)
);

-- ─── passenger_assignments ────────────────────────────────

CREATE TABLE IF NOT EXISTS passenger_assignments (
    id                   TEXT        PRIMARY KEY,
    trip_id              TEXT        NOT NULL REFERENCES trips(id),
    user_id              TEXT        NOT NULL REFERENCES users(id),
    estimated_pickup_time TIMESTAMPTZ,
    pickup_order         INTEGER,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(trip_id, user_id)
);

-- ─── notifications ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT               PRIMARY KEY,
    type        "NotificationType" NOT NULL,
    title       TEXT               NOT NULL,
    message     TEXT,
    read        BOOLEAN            NOT NULL DEFAULT false,
    user_id     TEXT               NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organization_member_org
    ON organization_members(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_member_user
    ON organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_org
    ON vehicles(organization_id);

CREATE INDEX IF NOT EXISTS idx_event_org
    ON events(organization_id);

CREATE INDEX IF NOT EXISTS idx_event_status
    ON events(status);

CREATE INDEX IF NOT EXISTS idx_trip_event
    ON trips(event_id);

CREATE INDEX IF NOT EXISTS idx_trip_driver
    ON trips(driver_id);

CREATE INDEX IF NOT EXISTS idx_ride_request_event
    ON ride_requests(event_id);

CREATE INDEX IF NOT EXISTS idx_ride_request_passenger
    ON ride_requests(passenger_id);

CREATE INDEX IF NOT EXISTS idx_passenger_assignment_trip
    ON passenger_assignments(trip_id);

CREATE INDEX IF NOT EXISTS idx_notification_user
    ON notifications(user_id);