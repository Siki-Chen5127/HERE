export * from "./db"
export * from "./migrations"
export * from "./schema"

import { runMigrations } from "./migrations"

export const initializeDatabase = () => {
  runMigrations()
}

