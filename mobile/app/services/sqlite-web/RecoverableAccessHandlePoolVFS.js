import { AccessHandlePoolVFS as PersistentVFS } from "../../../node_modules/expo-sqlite/web/wa-sqlite/AccessHandlePoolVFS.js"
import { MemoryVFS } from "../../../node_modules/expo-sqlite/web/wa-sqlite/MemoryVFS.js"

const storageErrors = new Set([
  "AbortError",
  "InvalidStateError",
  "NoModificationAllowedError",
  "NotAllowedError",
  "NotSupportedError",
  "QuotaExceededError",
  "SecurityError",
  "UnknownError",
])

export class AccessHandlePoolVFS {
  static async create(name, module) {
    if (
      typeof navigator.storage?.getDirectory === "function" &&
      typeof self.FileSystemFileHandle?.prototype.createSyncAccessHandle === "function"
    ) {
      const persistent = new PersistentVFS(name, module)
      try {
        await persistent.isReady()
        return persistent
      } catch (error) {
        await persistent.close().catch(() => {})
        if (!storageErrors.has(error?.name)) throw error
      }
    }

    // Run the same SQLite schema and queries for this tab without replacing its on-disk copy.
    const temporary = await MemoryVFS.create(name, module)
    self.postMessage({ type: "here-sqlite-storage-fallback" })
    return temporary
  }
}
