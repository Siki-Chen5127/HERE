import { db } from "../db"

export const alertLogsRepository = {
  create(userId: string, type: string, status: string, latitude?: number, longitude?: number) {
    return db.runSync(
      "INSERT INTO AlertLog (userId, type, status, latitude, longitude) VALUES (?, ?, ?, ?, ?)",
      userId,
      type,
      status,
      latitude ?? null,
      longitude ?? null,
    )
  },

  resolve(id: number) {
    db.runSync("UPDATE AlertLog SET status = ? WHERE id = ?", "resolved", id)
  },

  countSince(userId: string, sinceExpression: string) {
    const result = db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM AlertLog WHERE userId = ? AND timestamp >= ${sinceExpression}`,
      userId,
    )
    return result?.count ?? 0
  },
}

