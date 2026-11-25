import type { MobileAlertPayload } from "@/services/hereApi"

import { db } from "../db"
import type { AlertOutboxRecord } from "../schema"

export const alertOutboxRepository = {
  enqueue(payload: MobileAlertPayload) {
    db.runSync(
      `INSERT OR IGNORE INTO AlertOutbox (clientEventId, payload)
       VALUES (?, ?)`,
      payload.client_event_id,
      JSON.stringify(payload),
    )
  },

  listPending(limit = 20) {
    return db.getAllSync<AlertOutboxRecord>(
      `SELECT * FROM AlertOutbox
       ORDER BY createdAt ASC, id ASC
       LIMIT ?`,
      limit,
    )
  },

  remove(id: number) {
    db.runSync("DELETE FROM AlertOutbox WHERE id = ?", id)
  },

  markFailed(id: number, message: string) {
    db.runSync(
      `UPDATE AlertOutbox
       SET attempts = attempts + 1, lastError = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      message,
      id,
    )
  },
}
