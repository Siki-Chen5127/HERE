import { db } from "../db"

export type MoodValue = "good" | "okay" | "tired"

export interface MoodRecord {
  id: number
  userId: string
  recordDate: string
  mood: MoodValue
  createdAt: string
  updatedAt: string
}

// 按手机本地日期记录，避免 UTC 日期造成跨天偏差。
export function getLocalRecordDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export const moodsRepository = {
  getForDay(userId: string, recordDate: string) {
    if (!userId.trim()) {
      throw new Error("未找到当前账号")
    }

    return db.getFirstSync<MoodRecord>(
      `SELECT *
       FROM MoodRecord
       WHERE userId = ? AND recordDate = ?`,
      userId,
      recordDate,
    )
  },

  saveToday(userId: string, mood: MoodValue): MoodRecord {
    if (!userId.trim()) {
      throw new Error("未找到当前账号")
    }

    if (!["good", "okay", "tired"].includes(mood)) {
      throw new Error("无效的状态")
    }

    const recordDate = getLocalRecordDate()
    const now = new Date().toISOString()

    db.runSync(
      `INSERT INTO MoodRecord
         (userId, recordDate, mood, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(userId, recordDate)
       DO UPDATE SET
         mood = excluded.mood,
         updatedAt = excluded.updatedAt`,
      userId,
      recordDate,
      mood,
      now,
      now,
    )

    const saved = this.getForDay(userId, recordDate)

    if (!saved) {
      throw new Error("未能读取保存结果")
    }

    return saved
  },
}