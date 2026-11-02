import { db } from "../db"
import type { UserRecord, UserRole } from "../schema"
import { load, loadString, remove, saveString } from "@/utils/storage"

const ACTIVE_LOCAL_USER_ID_KEY = "AuthProvider.activeLocalUserId"
const AUTH_USER_KEY = "AuthProvider.authUser"

const setActiveUserId = (userId: number) => {
  saveString(ACTIVE_LOCAL_USER_ID_KEY, String(userId))
}

const findStoredAuthenticatedUser = () => {
  const authUser = load<{ phone?: string | null }>(AUTH_USER_KEY)
  const phone = authUser?.phone?.trim()
  if (!phone) return null
  return db.getFirstSync<UserRecord>("SELECT * FROM users WHERE phone = ?", phone)
}

export const usersRepository = {
  findByPhone(phone: string) {
    return db.getFirstSync<UserRecord>("SELECT * FROM users WHERE phone = ?", phone)
  },

  getActiveUser() {
    const storedId = Number(loadString(ACTIVE_LOCAL_USER_ID_KEY))
    if (Number.isInteger(storedId) && storedId > 0) {
      const user = db.getFirstSync<UserRecord>("SELECT * FROM users WHERE id = ?", storedId)
      if (user) return user
    }

    // 兼容升级前已经登录、但还没有 activeLocalUserId 的安装。
    const authenticatedUser = findStoredAuthenticatedUser()
    if (authenticatedUser) setActiveUserId(authenticatedUser.id)
    return authenticatedUser
  },

  createLocalUser(phone: string, password: string) {
    return db.runSync("INSERT INTO users (phone, password) VALUES (?, ?)", phone, password)
  },

  cacheAuthenticatedUser(phone: string, options?: { resetRole?: boolean }) {
    const existing = db.getFirstSync<{ id: number }>("SELECT id FROM users WHERE phone = ?", phone)
    if (existing) {
      db.runSync(
        `UPDATE users
         SET password = ?, role = CASE WHEN ? = 1 THEN NULL ELSE role END,
             updatedAt = CURRENT_TIMESTAMP
         WHERE id = ?`,
        "__remote_account__",
        options?.resetRole ? 1 : 0,
        existing.id,
      )
      setActiveUserId(existing.id)
      return db.getFirstSync<UserRecord>("SELECT * FROM users WHERE id = ?", existing.id)!
    }

    const result = db.runSync(
      "INSERT INTO users (phone, password) VALUES (?, ?)",
      phone,
      "__remote_account__",
    )
    const userId = Number(result.lastInsertRowId)
    setActiveUserId(userId)
    return db.getFirstSync<UserRecord>("SELECT * FROM users WHERE id = ?", userId)!
  },

  clearActiveUser() {
    remove(ACTIVE_LOCAL_USER_ID_KEY)
  },

  updateActiveUserRole(role: UserRole) {
    const user = this.getActiveUser()
    if (!user) throw new Error("本地数据库中未找到当前登录用户")
    this.updateRole(user.id, role)
    return { ...user, role }
  },

  updateRole(userId: number, role: UserRole) {
    db.runSync("UPDATE users SET role = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?", role, userId)
  },

  updateProfile(
    userId: number,
    profile: Pick<UserRecord, "realName" | "college" | "gender" | "age" | "bloodType" | "allergy" | "medicalHistory">,
  ) {
    db.runSync(
      `UPDATE users
       SET realName = ?, college = ?, gender = ?, age = ?, bloodType = ?, allergy = ?, medicalHistory = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE id = ?`,
      profile.realName ?? null,
      profile.college ?? null,
      profile.gender ?? null,
      profile.age ?? null,
      profile.bloodType ?? null,
      profile.allergy ?? null,
      profile.medicalHistory ?? null,
      userId,
    )
  },
}
