import { db } from "./db"

type Migration = {
  id: number
  name: string
  up: () => void
}

const columnExists = (tableName: string, columnName: string) => {
  const columns = db.getAllSync<{ name: string }>(`PRAGMA table_info(${tableName})`)
  return columns.some((column) => column.name === columnName)
}

const addColumnIfMissing = (tableName: string, columnName: string, columnDefinition: string) => {
  if (!columnExists(tableName, columnName)) {
    db.execSync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`)
  }
}

const migrations: Migration[] = [
  {
    id: 1,
    name: "initial_local_schema",
    up: () => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          phone TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT,
          realName TEXT,
          gender TEXT,
          age TEXT,
          bloodType TEXT,
          allergy TEXT,
          medicalHistory TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS EmergencyContact (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ownerId TEXT,
          name TEXT,
          phone TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS ActivityLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          type TEXT,
          address TEXT,
          latitude REAL,
          longitude REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS AlertLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          type TEXT,
          status TEXT,
          latitude REAL,
          longitude REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS geofences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          elderId TEXT UNIQUE NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          radius REAL NOT NULL,
          isActive INTEGER DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `)

      addColumnIfMissing("users", "role", "TEXT")
      addColumnIfMissing("users", "realName", "TEXT")
      addColumnIfMissing("users", "gender", "TEXT")
      addColumnIfMissing("users", "age", "TEXT")
      addColumnIfMissing("users", "bloodType", "TEXT")
      addColumnIfMissing("users", "allergy", "TEXT")
      addColumnIfMissing("users", "medicalHistory", "TEXT")
      addColumnIfMissing("users", "createdAt", "DATETIME DEFAULT CURRENT_TIMESTAMP")
      addColumnIfMissing("users", "updatedAt", "DATETIME DEFAULT CURRENT_TIMESTAMP")

      addColumnIfMissing("EmergencyContact", "ownerId", "TEXT")
      addColumnIfMissing("EmergencyContact", "name", "TEXT")
      addColumnIfMissing("EmergencyContact", "phone", "TEXT")
      addColumnIfMissing("EmergencyContact", "createdAt", "DATETIME DEFAULT CURRENT_TIMESTAMP")
      addColumnIfMissing("EmergencyContact", "updatedAt", "DATETIME DEFAULT CURRENT_TIMESTAMP")

      addColumnIfMissing("ActivityLog", "userId", "TEXT")
      addColumnIfMissing("ActivityLog", "type", "TEXT")
      addColumnIfMissing("ActivityLog", "address", "TEXT")
      addColumnIfMissing("ActivityLog", "latitude", "REAL")
      addColumnIfMissing("ActivityLog", "longitude", "REAL")
      addColumnIfMissing("ActivityLog", "timestamp", "DATETIME DEFAULT CURRENT_TIMESTAMP")

      addColumnIfMissing("AlertLog", "userId", "TEXT")
      addColumnIfMissing("AlertLog", "type", "TEXT")
      addColumnIfMissing("AlertLog", "status", "TEXT")
      addColumnIfMissing("AlertLog", "latitude", "REAL")
      addColumnIfMissing("AlertLog", "longitude", "REAL")
      addColumnIfMissing("AlertLog", "timestamp", "DATETIME DEFAULT CURRENT_TIMESTAMP")

      addColumnIfMissing("geofences", "isActive", "INTEGER DEFAULT 1")
      addColumnIfMissing("geofences", "createdAt", "DATETIME DEFAULT CURRENT_TIMESTAMP")
      addColumnIfMissing("geofences", "updatedAt", "DATETIME DEFAULT CURRENT_TIMESTAMP")
    },
  },
  {
    id: 2,
    name: "add_alert_outbox",
    up: () => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS AlertOutbox (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          clientEventId TEXT UNIQUE NOT NULL,
          payload TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          lastError TEXT,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_alert_outbox_created
        ON AlertOutbox(createdAt);
      `)
    },
  },
  {
    id: 3,
    name: "add_student_college_cache",
    up: () => {
      addColumnIfMissing("users", "college", "TEXT")
    },
  },
    {
    id: 4,
    name: "add_daily_mood_records",
    up: () => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS MoodRecord (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          recordDate TEXT NOT NULL,
          mood TEXT NOT NULL
            CHECK (mood IN ('good', 'okay', 'tired')),
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          UNIQUE(userId, recordDate)
        );
      `)
    },
  },
]

const ensureMigrationTable = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
}

const hasMigrationRun = (id: number) => {
  const result = db.getFirstSync<{ id: number }>("SELECT id FROM schema_migrations WHERE id = ?", id)
  return !!result
}

const markMigrationRun = (migration: Migration) => {
  db.runSync(
    "INSERT OR REPLACE INTO schema_migrations (id, name, appliedAt) VALUES (?, ?, CURRENT_TIMESTAMP)",
    migration.id,
    migration.name,
  )
}

export const runMigrations = () => {
  ensureMigrationTable()

  migrations.forEach((migration) => {
    if (hasMigrationRun(migration.id)) return

    db.withTransactionSync(() => {
      migration.up()
      markMigrationRun(migration)
    })
  })
}
