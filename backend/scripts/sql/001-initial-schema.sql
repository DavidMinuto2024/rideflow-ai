-- ═══════════════════════════════════════════════════════════
-- RideFlow AI — Initial database schema
--
-- Extracted from backend/prisma/schema.prisma for Supabase
-- Management API migration. All DDL uses IF [NOT] EXISTS for
-- idempotency so this script can be safely re-run.
-- ═══════════════════════════════════════════════════════════

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

-- ─── Organization ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Organization" (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    logo        TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── User ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "User" (
    id          TEXT PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    phone       TEXT,
    avatar      TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── OrganizationMember ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    id               TEXT         PRIMARY KEY,
    role             "Role"       NOT NULL DEFAULT 'PASSENGER',
    "organizationId" TEXT         NOT NULL REFERENCES "Organization"(id),
    "userId"         TEXT         NOT NULL REFERENCES "User"(id),
    "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE("organizationId", "userId")
);

-- ─── Vehicle ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Vehicle" (
    id               TEXT         PRIMARY KEY,
    plate            TEXT,
    model            TEXT,
    capacity         INTEGER      NOT NULL DEFAULT 4,
    "isActive"       BOOLEAN      NOT NULL DEFAULT true,
    "organizationId" TEXT         NOT NULL REFERENCES "Organization"(id),
    "driverId"       TEXT         REFERENCES "User"(id),
    "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── Event ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Event" (
    id                   TEXT         PRIMARY KEY,
    title                TEXT         NOT NULL,
    description          TEXT,
    date                 TIMESTAMPTZ  NOT NULL,
    origin               TEXT         NOT NULL,
    "originLat"          DOUBLE PRECISION,
    "originLng"          DOUBLE PRECISION,
    destination          TEXT         NOT NULL,
    "destLat"            DOUBLE PRECISION,
    "destLng"            DOUBLE PRECISION,
    capacity             INTEGER      NOT NULL DEFAULT 4,
    status               "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "organizationId"     TEXT         NOT NULL REFERENCES "Organization"(id),
    "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "inviteToken"        TEXT         UNIQUE,
    "inviteTokenExpiresAt" TIMESTAMPTZ,
    "arrivalTime"        TIMESTAMPTZ
);

-- ─── EventVehicle ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "EventVehicle" (
    id              TEXT         PRIMARY KEY,
    "eventId"       TEXT         NOT NULL REFERENCES "Event"(id),
    "vehicleId"     TEXT         NOT NULL REFERENCES "Vehicle"(id),
    "driverId"      TEXT         NOT NULL REFERENCES "User"(id),
    "startLocation" TEXT,
    "startLat"      DOUBLE PRECISION,
    "startLng"      DOUBLE PRECISION,
    "picoYPlaca"    BOOLEAN      NOT NULL DEFAULT false,
    "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    UNIQUE("eventId", "vehicleId")
);

-- ─── Trip ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Trip" (
    id                      TEXT         PRIMARY KEY,
    origin                  TEXT,
    "originLat"             DOUBLE PRECISION,
    "originLng"             DOUBLE PRECISION,
    dest                    TEXT,
    "destLat"               DOUBLE PRECISION,
    "destLng"               DOUBLE PRECISION,
    notes                   TEXT,
    distance                DOUBLE PRECISION,
    duration                DOUBLE PRECISION,
    "routeGeometry"         TEXT,
    "eventId"               TEXT         NOT NULL REFERENCES "Event"(id),
    "driverId"              TEXT         NOT NULL REFERENCES "User"(id),
    "vehicleId"             TEXT         REFERENCES "Vehicle"(id),
    "estimatedDepartureTime" TIMESTAMPTZ,
    "createdAt"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ─── RideRequest ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RideRequest" (
    id              TEXT            PRIMARY KEY,
    status          "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "tripId"        TEXT            REFERENCES "Trip"(id),
    "eventId"       TEXT            NOT NULL REFERENCES "Event"(id),
    "passengerId"   TEXT            NOT NULL REFERENCES "User"(id),
    "pickupLat"     DOUBLE PRECISION,
    "pickupLng"     DOUBLE PRECISION,
    "pickupAddress" TEXT,
    "createdAt"     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    "updatedAt"     TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE("eventId", "passengerId")
);

-- ─── PassengerAssignment ──────────────────────────────────

CREATE TABLE IF NOT EXISTS "PassengerAssignment" (
    id                   TEXT        PRIMARY KEY,
    "tripId"             TEXT        NOT NULL REFERENCES "Trip"(id),
    "userId"             TEXT        NOT NULL REFERENCES "User"(id),
    "estimatedPickupTime" TIMESTAMPTZ,
    "pickupOrder"        INTEGER,
    "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE("tripId", "userId")
);

-- ─── Notification ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Notification" (
    id          TEXT               PRIMARY KEY,
    type        "NotificationType" NOT NULL,
    title       TEXT               NOT NULL,
    message     TEXT,
    read        BOOLEAN            NOT NULL DEFAULT false,
    "userId"    TEXT               NOT NULL REFERENCES "User"(id),
    "createdAt" TIMESTAMPTZ        NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_organization_member_org
    ON "OrganizationMember"("organizationId");

CREATE INDEX IF NOT EXISTS idx_organization_member_user
    ON "OrganizationMember"("userId");

CREATE INDEX IF NOT EXISTS idx_vehicle_org
    ON "Vehicle"("organizationId");

CREATE INDEX IF NOT EXISTS idx_event_org
    ON "Event"("organizationId");

CREATE INDEX IF NOT EXISTS idx_event_status
    ON "Event"(status);

CREATE INDEX IF NOT EXISTS idx_trip_event
    ON "Trip"("eventId");

CREATE INDEX IF NOT EXISTS idx_trip_driver
    ON "Trip"("driverId");

CREATE INDEX IF NOT EXISTS idx_ride_request_event
    ON "RideRequest"("eventId");

CREATE INDEX IF NOT EXISTS idx_ride_request_passenger
    ON "RideRequest"("passengerId");

CREATE INDEX IF NOT EXISTS idx_passenger_assignment_trip
    ON "PassengerAssignment"("tripId");

CREATE INDEX IF NOT EXISTS idx_notification_user
    ON "Notification"("userId");