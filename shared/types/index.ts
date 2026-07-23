// ═══════════════════════════════════════════════════════════
// RideFlow AI — Shared TypeScript Types
//
// Mirrors the Prisma schema for use across backend and frontend.
// ═══════════════════════════════════════════════════════════

// ─── Enums ────────────────────────────────────────────────

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  DRIVER = 'DRIVER',
  PASSENGER = 'PASSENGER',
}

export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  FINISHED = 'FINISHED',
}

export enum RequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

// ─── Core Entities ────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  role: Role;
  organizationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  plate: string | null;
  model: string | null;
  capacity: number;
  isActive: boolean;
  organizationId: string;
  driverId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  origin: string;
  originLat: number | null;
  originLng: number | null;
  destination: string;
  destLat: number | null;
  destLng: number | null;
  capacity: number;
  status: EventStatus;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  origin: string | null;
  dest: string | null;
  notes: string | null;
  eventId: string;
  driverId: string;
  vehicleId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RideRequest {
  id: string;
  status: RequestStatus;
  tripId: string;
  passengerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassengerAssignment {
  id: string;
  tripId: string;
  userId: string;
  createdAt: string;
}

// ─── DTOs / Payloads ──────────────────────────────────────

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
}

export interface CreateEventDto {
  title: string;
  description?: string;
  date: string;
  origin: string;
  originLat?: number;
  originLng?: number;
  destination: string;
  destLat?: number;
  destLng?: number;
  capacity?: number;
}

export interface CreateVehicleDto {
  plate?: string;
  model?: string;
  capacity?: number;
  driverId?: string;
}

export interface CreateRideRequestDto {
  tripId: string;
}

// ─── Dashboard ────────────────────────────────────────────

export interface DashboardKpi {
  totalOrganizations: number;
  totalUsers: number;
  totalEvents: number;
  activeTrips: number;
  occupancyRate: number;
  kmSaved: number;
  co2Saved: number;
}
