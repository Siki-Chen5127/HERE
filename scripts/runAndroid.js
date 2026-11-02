const { execFileSync, spawnSync } = require("child_process")
const fs = require("fs")
const path = require("path")

const projectRoot = path.resolve(__dirname, "..")
const mappingRoot = path.dirname(projectRoot)
const projectDirectoryName = path.basename(projectRoot)
const driveCandidates = ["H:", "R:", "X:"]

function normalizeWindowsPath(value) {
  return path.resolve(value).replace(/[\\/]+$/, "").toLowerCase()
}

function getSubstMappings() {
  const output = execFileSync("subst", [], { encoding: "utf8" })
  const mappings = new Map()

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([a-z]:)\\: => (.+)$/i)
    if (match) mappings.set(match[1].toUpperCase(), match[2].trim())
  }

  return mappings
}

function selectShortDrive() {
  const mappings = getSubstMappings()
  const normalizedMappingRoot = normalizeWindowsPath(mappingRoot)
  const normalizedProjectRoot = normalizeWindowsPath(projectRoot)

  for (const [drive, target] of mappings) {
    if (normalizeWindowsPath(target) === normalizedMappingRoot) return drive
  }

  // Migrate the earlier root-level mapping, which Expo cannot search above.
  for (const [drive, target] of mappings) {
    if (normalizeWindowsPath(target) === normalizedProjectRoot) {
      execFileSync("subst", [drive, "/D"], { stdio: "inherit" })
      mappings.delete(drive)
      break
    }
  }

  for (const drive of driveCandidates) {
    if (!mappings.has(drive) && !fs.existsSync(`${drive}\\`)) {
      execFileSync("subst", [drive, mappingRoot], { stdio: "inherit" })
      return drive
    }
  }

  throw new Error("H:, R: and X: are already in use; no short drive is available for Android build")
}

function removeGeneratedDirectory(relativePath) {
  const target = path.resolve(projectRoot, relativePath)
  const relative = path.relative(projectRoot, target)

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to remove path outside the project: ${target}`)
  }

  fs.rmSync(target, { recursive: true, force: true })
}

function clearStaleNativePaths(shortRoot) {
  const autolinkingCmake = path.join(
    projectRoot,
    "android",
    "app",
    "build",
    "generated",
    "autolinking",
    "src",
    "main",
    "jni",
    "Android-autolinking.cmake",
  )

  if (!fs.existsSync(autolinkingCmake)) return

  const contents = fs.readFileSync(autolinkingCmake, "utf8")
  const expectedPrefix = shortRoot.replace(/\\/g, "/")
  if (contents.includes(expectedPrefix)) return

  console.log("Android native cache contains long absolute paths; rebuilding it once...")
  removeGeneratedDirectory("android/build/generated/autolinking")
  removeGeneratedDirectory("android/app/build/generated/autolinking")
  removeGeneratedDirectory("android/app/build/intermediates/cxx")
  removeGeneratedDirectory("android/app/.cxx")
}

function findJdk17() {
  const javaHome = process.env.JAVA_HOME
  if (javaHome && /jdk-?17/i.test(javaHome) && fs.existsSync(javaHome)) return javaHome

  const adoptiumRoot = path.join(process.env.ProgramFiles || "C:\\Program Files", "Eclipse Adoptium")
  if (!fs.existsSync(adoptiumRoot)) return javaHome

  const candidates = fs
    .readdirSync(adoptiumRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("jdk-17"))
    .map((entry) => path.join(adoptiumRoot, entry.name))
    .sort()
    .reverse()

  return candidates[0] || javaHome
}

function configureBackendPortForward() {
  const result = spawnSync("adb", ["reverse", "tcp:8000", "tcp:8000"], {
    encoding: "utf8",
    shell: true,
  })

  if (result.status === 0) {
    console.log("Forwarded phone port 8000 to the HERE backend on this computer")
    return
  }

  const detail = (result.stderr || result.stdout || "ADB is unavailable").trim()
  console.warn(`Unable to forward backend port 8000: ${detail}`)
}

function run() {
  if (process.platform !== "win32") {
    const result = spawnSync("npx", ["expo", "run:android", ...process.argv.slice(2)], {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    })
    process.exit(result.status ?? 1)
  }

  const shortDrive = selectShortDrive()
  const shortRoot = `${shortDrive}\\${projectDirectoryName}`
  clearStaleNativePaths(shortRoot)
  configureBackendPortForward()

  const env = { ...process.env, INIT_CWD: shortRoot }
  const jdk17 = findJdk17()
  if (jdk17) env.JAVA_HOME = jdk17

  console.log(`Building Android app from ${shortRoot} -> ${projectRoot}`)
  const result = spawnSync("npx.cmd", ["expo", "run:android", ...process.argv.slice(2)], {
    cwd: shortRoot,
    env,
    shell: true,
    stdio: "inherit",
  })

  if (result.error) console.error(result.error)
  process.exit(result.status ?? 1)
}

run()
