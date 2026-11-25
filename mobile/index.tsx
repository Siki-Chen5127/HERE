import "@expo/metro-runtime"
import { registerRootComponent } from "expo"
import * as SQLite from "expo-sqlite"
import React, { useEffect, useState } from "react"
import { Platform, Text, View } from "react-native"

import { initializeAMapSdk } from "@/services/amap"

initializeAMapSdk()

function Root() {
  const [appReady, setAppReady] = useState(Platform.OS !== "web")
  const [startupError, setStartupError] = useState<string | null>(null)
  const [temporaryStorage, setTemporaryStorage] = useState(false)

  useEffect(() => {
    if (Platform.OS !== "web") return
    const onStorageFallback = () => setTemporaryStorage(true)
    window.addEventListener("here-sqlite-storage-fallback", onStorageFallback)

    // Load the Web SQLite worker before screens make synchronous database calls.
    SQLite.openDatabaseAsync("assignment.db")
      .then(() => setAppReady(true))
      .catch((error: unknown) => {
        console.error("[Database] 初始化失败", error)
        setStartupError(error instanceof Error ? error.message : String(error))
      })

    return () => window.removeEventListener("here-sqlite-storage-fallback", onStorageFallback)
  }, [])

  if (startupError) {
    return <View><Text>本地数据初始化失败，请刷新页面重试。{startupError}</Text></View>
  }
  if (!appReady) return null

  const { App } = require("@/app") as typeof import("@/app")
  if (temporaryStorage) {
    return (
      <View style={{ flex: 1 }}>
        <Text
          accessibilityRole="alert"
          style={{ backgroundColor: "#FFF4DC", color: "#694509", padding: 10, textAlign: "center" }}
        >
          当前浏览器无法使用持久存储，本机记录仅在此标签页有效。
        </Text>
        <App />
      </View>
    )
  }
  return <App />
}

registerRootComponent(Root)
