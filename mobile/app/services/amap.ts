import { Platform } from "react-native"
import { AMapSdk } from "react-native-amap3d"

const androidApiKey = process.env.EXPO_PUBLIC_AMAP_ANDROID_KEY?.trim() ?? ""
const webApiKey = process.env.EXPO_PUBLIC_AMAP_JS_KEY?.trim() ?? ""

let initializationAttempted = false
let initializationError: string | null = null

export function isAMapConfigured() {
  if (Platform.OS === "android") return androidApiKey.length > 0
  if (Platform.OS === "web") return webApiKey.length > 0
  return true
}

export function getAMapInitializationError() {
  return initializationError
}

/**
 * The native map SDK must be initialized before any MapView is mounted.
 * Expo inlines EXPO_PUBLIC_* values when it creates the JavaScript bundle.
 */
export function initializeAMapSdk() {
  if (Platform.OS !== "android" || initializationAttempted) return

  initializationAttempted = true

  if (!androidApiKey) {
    initializationError = "缺少 EXPO_PUBLIC_AMAP_ANDROID_KEY"
    console.error(`[AMap] ${initializationError}，地图预览已停用。`)
    return
  }

  try {
    AMapSdk.init(androidApiKey)
  } catch (error) {
    initializationError = error instanceof Error ? error.message : String(error)
    console.error("[AMap] 地图 SDK 初始化失败", error)
  }
}
