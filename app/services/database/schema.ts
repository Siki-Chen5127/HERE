export const tableNames = {
  migrations: "schema_migrations",
  users: "users",
  emergencyContacts: "EmergencyContact",
  activityLogs: "ActivityLog",
  alertLogs: "AlertLog",
  alertOutbox: "AlertOutbox",
  geofences: "geofences",
} as const

export type UserRole = "self" | "carer" | "elder"

export type UserRecord = {
  id: number
  phone: string
  password: string
  role?: UserRole | null
  college?: string | null
  realName?: string | null
  gender?: string | null
  age?: string | null
  bloodType?: string | null
  allergy?: string | null
  medicalHistory?: string | null
}

export type EmergencyContactRecord = {
  id: number
  ownerId: string
  name: string
  phone: string
}

export type ActivityLogRecord = {
  id: number
  userId: string
  type: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  timestamp: string
}

export type AlertLogRecord = {
  id: number
  userId: string
  type: string
  status: string
  latitude?: number | null
  longitude?: number | null
  timestamp: string
}

export type AlertOutboxRecord = {
  id: number
  clientEventId: string
  payload: string
  attempts: number
  lastError?: string | null
  createdAt: string
  updatedAt: string
}

export type GeofenceRecord = {
  id: number
  elderId: string
  latitude: number
  longitude: number
  radius: number
  isActive: number
}
