import { db } from "../db"
import type { EmergencyContactRecord } from "../schema"

export const contactsRepository = {
  listByOwner(ownerId: string) {
    return db.getAllSync<EmergencyContactRecord>(
      "SELECT * FROM EmergencyContact WHERE ownerId = ? ORDER BY id DESC",
      ownerId,
    )
  },

  create(ownerId: string, name: string, phone: string) {
    return db.runSync(
      "INSERT INTO EmergencyContact (ownerId, name, phone) VALUES (?, ?, ?)",
      ownerId,
      name,
      phone,
    )
  },

  update(id: number, name: string, phone: string) {
    db.runSync(
      "UPDATE EmergencyContact SET name = ?, phone = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      name,
      phone,
      id,
    )
  },

  remove(id: number) {
    db.runSync("DELETE FROM EmergencyContact WHERE id = ?", id)
  },
}

