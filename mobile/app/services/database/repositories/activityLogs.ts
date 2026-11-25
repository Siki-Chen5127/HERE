import { db } from "../db"
import type { ActivityLogRecord } from "../schema"

export const activityLogsRepository = {
  createTrajectory(userId: string, address: string, latitude: number, longitude: number) {
    return db.runSync(
      "INSERT INTO ActivityLog (userId, type, address, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      userId,
      "trajectory",
      address,
      latitude,
      longitude,
    )
  },

  listRecentTrajectory(userId: string, limit = 1000) {
    return db.getAllSync<ActivityLogRecord>(
      "SELECT * FROM ActivityLog WHERE userId = ? AND type = 'trajectory' ORDER BY timestamp DESC LIMIT ?",
      userId,
      limit,
    )
  },

  listSince(userId: string, sinceExpression: string) {
    return db.getAllSync<ActivityLogRecord>(
      `SELECT * FROM ActivityLog WHERE userId = ? AND timestamp >= ${sinceExpression} ORDER BY timestamp DESC`,
      userId,
    )
  },
}

