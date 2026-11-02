import { db } from "../db"
import type { GeofenceRecord } from "../schema"

export const geofencesRepository = {
  getByElder(elderId: string) {
    return db.getFirstSync<GeofenceRecord>("SELECT * FROM geofences WHERE elderId = ?", elderId)
  },

  getActiveByElder(elderId: string) {
    return db.getFirstSync<GeofenceRecord>(
      "SELECT * FROM geofences WHERE elderId = ? AND isActive = 1",
      elderId,
    )
  },

  upsert(elderId: string, latitude: number, longitude: number, radius: number) {
    const existing = this.getByElder(elderId)

    if (existing) {
      db.runSync(
        "UPDATE geofences SET latitude = ?, longitude = ?, radius = ?, isActive = 1, updatedAt = CURRENT_TIMESTAMP WHERE elderId = ?",
        latitude,
        longitude,
        radius,
        elderId,
      )
      return
    }

    db.runSync(
      "INSERT INTO geofences (elderId, latitude, longitude, radius, isActive) VALUES (?, ?, ?, ?, 1)",
      elderId,
      latitude,
      longitude,
      radius,
    )
  },
}

