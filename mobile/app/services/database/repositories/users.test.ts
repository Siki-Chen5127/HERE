import { db } from "../db"
import { usersRepository } from "./users"
import { load, loadString, remove, saveString } from "@/utils/storage"

jest.mock("../db", () => ({
  db: {
    getFirstSync: jest.fn(),
    runSync: jest.fn(),
  },
}))

jest.mock("@/utils/storage", () => ({
  load: jest.fn(),
  loadString: jest.fn(),
  remove: jest.fn(),
  saveString: jest.fn(),
}))

const mockedDb = db as jest.Mocked<typeof db>
const mockedLoad = load as jest.Mock
const mockedLoadString = loadString as jest.Mock
const mockedRemove = remove as jest.Mock
const mockedSaveString = saveString as jest.Mock

describe("usersRepository active user", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("selects the explicitly active user instead of the newest row", () => {
    mockedLoadString.mockReturnValue("7")
    mockedDb.getFirstSync.mockReturnValue({ id: 7, phone: "15962085127", password: "x" })

    expect(usersRepository.getActiveUser()?.phone).toBe("15962085127")
    expect(mockedDb.getFirstSync).toHaveBeenCalledWith("SELECT * FROM users WHERE id = ?", 7)
  })

  it("restores the active user from the authenticated phone after an upgrade", () => {
    mockedLoadString.mockReturnValue(null)
    mockedLoad.mockReturnValue({ phone: "15962085127" })
    mockedDb.getFirstSync.mockReturnValue({ id: 3, phone: "15962085127", password: "x" })

    expect(usersRepository.getActiveUser()?.id).toBe(3)
    expect(mockedDb.getFirstSync).toHaveBeenCalledWith(
      "SELECT * FROM users WHERE phone = ?",
      "15962085127",
    )
    expect(mockedSaveString).toHaveBeenCalledWith("AuthProvider.activeLocalUserId", "3")
  })

  it("preserves an existing persona on login and clears it for a new registration", () => {
    mockedDb.getFirstSync
      .mockReturnValueOnce({ id: 4 })
      .mockReturnValueOnce({ id: 4, phone: "15962085127", password: "x", role: "self" })

    const user = usersRepository.cacheAuthenticatedUser("15962085127", { resetRole: false })

    expect(user.role).toBe("self")
    expect(mockedDb.runSync).toHaveBeenCalledWith(
      expect.stringContaining("role = CASE WHEN ? = 1 THEN NULL ELSE role END"),
      "__remote_account__",
      0,
      4,
    )
    expect(mockedSaveString).toHaveBeenCalledWith("AuthProvider.activeLocalUserId", "4")

    jest.clearAllMocks()
    mockedDb.getFirstSync
      .mockReturnValueOnce({ id: 4 })
      .mockReturnValueOnce({ id: 4, phone: "15962085127", password: "x", role: null })

    expect(usersRepository.cacheAuthenticatedUser("15962085127", { resetRole: true }).role).toBeNull()
    expect(mockedDb.runSync).toHaveBeenCalledWith(
      expect.any(String),
      "__remote_account__",
      1,
      4,
    )
  })

  it("clears only the active binding on logout", () => {
    usersRepository.clearActiveUser()
    expect(mockedRemove).toHaveBeenCalledWith("AuthProvider.activeLocalUserId")
  })
})
