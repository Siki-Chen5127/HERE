import { db } from "@/services/database/db"
import { usersRepository } from "@/services/database/repositories"
import { getLocalRecordDate, moodsRepository, type MoodRecord } from "@/services/database/repositories/moods"
import { mobileApi, type StudentUser, type SupportRequest, type WeeklyReflectionInput, type WeeklyReflection } from "@/services/hereApi"
import { loadString, saveString } from "@/utils/storage"

export const nightOptions = [
  ["routine", "日常活动（如起夜）"],
  ["study", "学习或工作"],
  ["travel", "必要出行"],
  ["other", "其他原因"],
  ["excluded", "不纳入回顾"],
] as const
export type NightKind = typeof nightOptions[number][0]
export type NightNote = { kind: NightKind; note: string }
export type NightNotes = Record<string, NightNote>
export type NightPeriod = { key: string; day: string; hour: number }
export type WeeklySnapshot = {
  days: string[]; moods: MoodRecord[]; survey: WeeklyReflectionInput["survey"];
  nightPeriods: NightPeriod[]; activity: number[]; notes: NightNotes;
  support: WeeklyReflectionInput["support"]; activityAvailable: boolean;
}
type LocalSurvey = { rest: string; stress: string; support: string; lastSaved: number }
type CachedReflection = { signature: string; result: WeeklyReflection }
function readLocal<T>(key: string): T | null {
  try { const raw = loadString(key); return raw ? JSON.parse(raw) as T : null } catch { return null }
}

export function weekBounds(now = new Date()) {
  const end = new Date(now)
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() + 1)
  const start = new Date(end)
  start.setDate(start.getDate() - 7)
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(day.getDate() + i)
    return getLocalRecordDate(day)
  })
  return { start, end, days }
}
const inWeek = (value: string | number | null | undefined, start: Date, end: Date) => {
  if (value == null) return false
  const time = typeof value === "number" ? value : Date.parse(value)
  return time >= start.getTime() && time < end.getTime()
}
export function summarizeSupport(orders: SupportRequest[], start: Date, end: Date) {
  let submitted = 0, awaiting = 0, followed_up = 0, completed = 0
  for (const order of orders) {
    const isNew = inWeek(order.milestones?.submitted || order.createdAt, start, end)
    const updated = Object.values(order.milestones || {}).some(value => inWeek(value, start, end)) ||
      order.updates.some(update => inWeek(update.createdAt, start, end))
    if (!isNew && !updated) continue
    if (isNew) submitted++
    if (order.milestones?.completed || order.status === "resolved") completed++
    else if (order.milestones?.followedUp || order.updates.length) followed_up++
    else awaiting++
  }
  return { submitted, awaiting, followed_up, completed }
}
function localDateFromSql(value: string) {
  // SQLite CURRENT_TIMESTAMP is UTC, not the browser's local time.
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(value)
    ? value.replace(" ", "T") + "Z" : value
  return new Date(normalized)
}
const noteKey = (id: string) => "here.weekly.night-notes.v1." + id
const cacheKey = (id: string) => "here.weekly.reflection.v1." + id
export const getReflectionCache = (id: string) => readLocal<CachedReflection>(cacheKey(id))
export const saveReflectionCache = (id: string, value: CachedReflection) => saveString(cacheKey(id), JSON.stringify(value))
export function saveNightNote(id: string, period: NightPeriod, notes: NightNotes, note: NightNote) {
  const next = { ...notes, [period.key]: note }
  return saveString(noteKey(id), JSON.stringify(next)) ? next : null
}

export async function loadWeeklySnapshot(user: StudentUser): Promise<WeeklySnapshot> {
  const { start, end, days } = weekBounds()
  const moods = moodsRepository.listSince(user.id, days[0]).filter(item => days.includes(item.recordDate))
  const raw = readLocal<LocalSurvey>("wellbeing:" + user.id)
  const survey = raw && inWeek(raw.lastSaved, start, end) &&
    typeof raw.rest === "string" && typeof raw.stress === "string" && typeof raw.support === "string" &&
    [raw.rest, raw.stress, raw.support].some(text => text.trim())
    ? { rest: raw.rest.slice(0, 600), stress: raw.stress.slice(0, 600), support: raw.support.slice(0, 600) } : null
  const activity = days.map(() => 0)
  const periods = new Map<string, NightPeriod>()
  let activityAvailable = false
  try {
    const localUser = user.phone ? usersRepository.findByPhone(user.phone) : null
    if (localUser) {
      const logs = db.getAllSync<{ timestamp: string }>(
        "SELECT timestamp FROM ActivityLog WHERE userId = ? AND type = 'trajectory' AND datetime(timestamp) >= datetime(?) AND datetime(timestamp) < datetime(?)",
        String(localUser.id), start.toISOString(), end.toISOString(),
      )
      activityAvailable = true
      for (const log of logs) {
        const date = localDateFromSql(log.timestamp)
        if (!Number.isFinite(date.getTime())) continue
        const day = getLocalRecordDate(date)
        const index = days.indexOf(day)
        if (index < 0) continue
        activity[index]++
        const hour = date.getHours()
        if (hour >= 21 || hour < 5) {
          const key = day + "T" + String(hour).padStart(2, "0")
          periods.set(key, { key, day, hour })
        }
      }
    }
  } catch { /* unavailable is different from zero records */ }
  let support: WeeklyReflectionInput["support"] = null
  try { support = summarizeSupport(await mobileApi.getSupportRequests(), start, end) } catch {}
  return { days, moods, survey, nightPeriods: Array.from(periods.values()).sort((a, b) => b.key.localeCompare(a.key)),
    activity, activityAvailable, notes: readLocal<NightNotes>(noteKey(user.id)) || {}, support }
}
export function reflectionInput(snapshot: WeeklySnapshot): WeeklyReflectionInput {
  const night_context: WeeklyReflectionInput["night_context"] = {}
  for (const period of snapshot.nightPeriods) {
    const reason = snapshot.notes[period.key]?.kind
    if (reason && reason !== "excluded" && nightOptions.some(([value]) => reason === value)) {
      night_context[reason] = (night_context[reason] || 0) + 1
    }
  }
  return {
    moods: snapshot.moods.map(item => ({ day: item.recordDate, mood: item.mood })),
    survey: snapshot.survey,
    support: snapshot.support,
    night_context,
  }
}
