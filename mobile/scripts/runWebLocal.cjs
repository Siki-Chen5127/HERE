const { spawn } = require("node:child_process")
const http = require("node:http")
const { once } = require("node:events")
const { parseArgs } = require("node:util")
const path = require("node:path")

const loopback = "127.0.0.1"
const isolation = {
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "credentialless",
}
try { process.loadEnvFile(path.join(__dirname, "../.env.local")) } catch (error) { if (error.code !== "ENOENT") throw error }
const { values } = parseArgs({
  options: {
    port: { type: "string", default: "8081" },
    "api-port": { type: "string", default: process.env.HERE_LOCAL_API_PORT || "8000" },
    clear: { type: "boolean" },
  },
})

function checkPort(value) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("Expected a local port between 1024 and 65535")
  }
  return port
}

async function start() {
  const webPort = checkPort(values.port)
  const apiPort = checkPort(values["api-port"])
  const reserved = http.createServer().listen(0, loopback)
  await once(reserved, "listening")
  const metroPort = reserved.address().port
  reserved.close()
  await once(reserved, "close")

  const authority = new Set([loopback + ":" + webPort, "localhost:" + webPort])
  const origin = "http://" + loopback + ":" + webPort
  const allowed = (req) =>
    authority.has(req.headers.host) && (!req.headers.origin ||
      (authority.has(req.headers.origin.slice(7)) && req.headers.origin.startsWith("http://")))
  const route = (req) => {
    const pathname = req.url.split("?")[0]
    return pathname === "/api/v1" || pathname.startsWith("/api/v1/") ? apiPort : metroPort
  }
  const relay = (req, port) => http.request({
    host: loopback,
    port,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: loopback + ":" + webPort },
  })

  // Expo SDK 54 serves its HTML before the custom Metro middleware. Apply the
  // headers here so the document and worker enable SQLite shared memory.
  const server = http.createServer((req, res) => {
    if (!allowed(req)) {
      res.writeHead(403).end()
      return
    }
    const upstream = relay(req, route(req))
    upstream.on("response", (reply) => {
      res.writeHead(reply.statusCode, { ...reply.headers, ...isolation })
      reply.on("error", () => res.destroy())
      reply.pipe(res)
    })
    upstream.on("error", () => {
      if (res.headersSent) res.destroy()
      else res.writeHead(502, isolation).end("Local Expo or API is not ready. Please retry.")
    })
    res.on("close", () => { if (!res.writableFinished) upstream.destroy() })
    req.pipe(upstream)
  })

  // Keep Expo Fast Refresh connected through the same local origin.
  server.on("upgrade", (req, client, clientHead) => {
    if (!allowed(req) || route(req) !== metroPort) return client.destroy()
    const upstream = relay(req, metroPort)
    client.on("error", () => upstream.destroy())
    client.on("close", () => upstream.destroy())
    upstream.on("error", () => client.destroy())
    upstream.on("response", (reply) => { reply.resume(); client.destroy() })
    upstream.on("upgrade", (reply, socket, head) => {
      socket.on("error", () => client.destroy())
      socket.on("close", () => client.destroy())
      client.write("HTTP/1.1 101 Switching Protocols\r\n")
      for (let i = 0; i < reply.rawHeaders.length; i += 2) {
        client.write(reply.rawHeaders[i] + ": " + reply.rawHeaders[i + 1] + "\r\n")
      }
      client.write("\r\n")
      if (head.length) client.write(head)
      if (clientHead.length) socket.write(clientHead)
      client.pipe(socket).pipe(client)
    })
    upstream.end()
  })
  server.listen(webPort, loopback)
  await once(server, "listening")

  const expo = spawn(process.execPath, [
    require.resolve("expo/bin/cli"), "start", "--web", "--offline", "--port", String(metroPort),
    ...(values.clear ? ["--clear"] : []),
  ], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      HERE_WEB_BASE_PATH: "/",
      EXPO_PACKAGER_PROXY_URL: origin,
      EXPO_PUBLIC_HERE_API_URL: "/api/v1",
      EXPO_NO_TELEMETRY: "1",
    },
    stdio: "inherit",
    windowsHide: true,
  })
  console.log("Student web: " + origin + "/  (wait for Metro to finish starting)")

  const stop = (code) => {
    expo.kill()
    server.close()
    process.exit(code)
  }
  process.once("SIGINT", () => stop(0))
  process.once("SIGTERM", () => stop(0))
  expo.once("error", (err) => { console.error(err.message); stop(1) })
  expo.once("exit", (code) => stop(code ?? 1))
}

start().catch((error) => {
  console.error(error.code === "EADDRINUSE" ? "Web port in use; stop the old student server or pass --port 8082." : error.message)
  process.exitCode = 1
})
