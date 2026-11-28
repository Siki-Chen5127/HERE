import { db } from "@/services/database/db"
import { usersRepository } from "@/services/database/repositories"
import { moodsRepository } from "@/services/database/repositories/moods"
import { mobileApi } from "@/services/hereApi"
import { loadString, saveString } from "@/utils/storage"
import { loadWeeklySnapshot, reflectionInput, saveNightNote, weekBounds, summarizeSupport } from "./weeklyReflection"

jest.mock("@/services/database/db", () => ({ db: { getAllSync: jest.fn() } }))
jest.mock("@/services/database/repositories", () => ({ usersRepository: { findByPhone: jest.fn() } }))
jest.mock("@/services/database/repositories/moods", () => ({
  getLocalRecordDate: (date = new Date()) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-"),
  moodsRepository: { listSince: jest.fn() },
}))
jest.mock("@/services/hereApi", () => ({ mobileApi: { getSupportRequests: jest.fn() } }))
jest.mock("@/utils/storage", () => ({ loadString: jest.fn(), saveString: jest.fn() }))

describe("weekly reflection context", () => {
  const user = { id: "test-student", phone: "10000000000", name: "Demo", role: "student" }
  const sqlDate = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ")
  beforeEach(() => {
    jest.clearAllMocks()
    ;(usersRepository.findByPhone as jest.Mock).mockReturnValue({ id: 12 })
    ;(moodsRepository.listSince as jest.Mock).mockReturnValue([])
    ;(mobileApi.getSupportRequests as jest.Mock).mockResolvedValue([])
    ;(loadString as jest.Mock).mockReturnValue(null)
    ;(saveString as jest.Mock).mockReturnValue(true)
  })
  it("merges night samples by local hour and sends only voluntarily selected categories", async () => {
    const { start } = weekBounds()
    const night = new Date(start)
    night.setHours(1, 10)
    const sample2 = new Date(night); sample2.setMinutes(25)
    const next = new Date(night); next.setHours(2)
    const day = new Date(night); day.setHours(10)
    ;(db.getAllSync as jest.Mock).mockReturnValue([night, sample2, next, day].map(date => ({ timestamp: sqlDate(date) })))
    const snapshot = await loadWeeklySnapshot(user)
    expect(snapshot.nightPeriods).toHaveLength(2)
    expect(snapshot.activity[0]).toBe(4)
    expect(db.getAllSync).toHaveBeenCalledWith(expect.stringContaining("userId = ?"), "12", expect.any(String), expect.any(String))
    expect(reflectionInput(snapshot).night_context).toEqual({})
    const first = snapshot.nightPeriods[0], second = snapshot.nightPeriods[1]
    const notes = saveNightNote(user.id, first, {}, { kind: "routine", note: "只是在上厕所" })!
    const notes2 = saveNightNote(user.id, second, notes, { kind: "excluded", note: "private" })!
    const payload = reflectionInput({ ...snapshot, notes: notes2 })
    expect(payload.night_context).toEqual({ routine: 1 })
    expect(JSON.stringify(payload)).not.toContain("只是在上厕所")
    expect(JSON.stringify(payload)).not.toContain("private")
    expect(saveString).toHaveBeenCalledWith("here.weekly.night-notes.v1.test-student", expect.any(String))
  })
  it("reads only the current user's seven days and treats a support failure as unknown", async () => {
    const { days, start } = weekBounds()
    ;(db.getAllSync as jest.Mock).mockReturnValue([])
    ;(moodsRepository.listSince as jest.Mock).mockReturnValue([{ recordDate: days[0], mood: "good" }, { recordDate: "2099-01-01", mood: "tired" }])
    ;(loadString as jest.Mock).mockImplementation((key: string) => key === "wellbeing:test-student" ? JSON.stringify({
      rest: "感觉还好", stress: "", support: "", lastSaved: start.getTime(),
    }) : null)
    ;(mobileApi.getSupportRequests as jest.Mock).mockRejectedValue(new Error("offline"))
    const snapshot = await loadWeeklySnapshot(user)
    expect(moodsRepository.listSince).toHaveBeenCalledWith("test-student", days[0])
    expect(snapshot.moods).toHaveLength(1)
    expect(snapshot.survey?.rest).toBe("感觉还好")
    expect(reflectionInput(snapshot).support).toBeNull()
  })
  it("includes this week's support updates without copying private request content", () => {
    const { start, end } = weekBounds()
    const stamp = new Date(start.getTime()+10000).toISOString()
    const old = new Date(start.getTime()-10000).toISOString()
    const a = { number: "test1", status: "open", message: "private", createdAt: stamp, updates: [] }
    const b = { number: "test2", status: "resolved", message: "private", createdAt: old, updates: [{ text: "private", createdAt: stamp }] }
    expect(summarizeSupport([a,b], start, end)).toEqual({ submitted: 1, awaiting: 1, followed_up: 0, completed: 1 })
  })
})
