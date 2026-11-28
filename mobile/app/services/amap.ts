import { Platform } from "react-native"
import { AMapSdk } from "react-native-amap3d"

const androidApiKey = process.env.EXPO_PUBLIC_AMAP_ANDROID_KEY?.trim() ?? ""
const webApiKey = process.env.EXPO_PUBLIC_AMAP_JS_KEY?.trim() ?? ""
const staticMapKey = process.env.EXPO_PUBLIC_AMAP_WEB_KEY?.trim() ?? ""

let initializationAttempted = false
let initializationError: string | null = null

export function isAMapConfigured() {
  if (Platform.OS === "android") return androidApiKey.length > 0
  if (Platform.OS === "web") return webApiKey.length > 0
  return true
}

export function getAMapStaticMapUrl(location: { latitude: number; longitude: number }, size = { width: 640, height: 320 }) {
  if (!staticMapKey || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null
  if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) return null
  const point = location.longitude.toFixed(6) + "," + location.latitude.toFixed(6)
  // Match the container's aspect ratio so the full map and attribution remain visible.
  const scale = 640 / Math.max(size.width, size.height, 1)
  const dimensions = Math.max(1, Math.round(size.width * scale)) + "*" + Math.max(1, Math.round(size.height * scale))
  return "https://restapi.amap.com/v3/staticmap?location=" + point +
    "&zoom=16&size=" + dimensions + "&markers=" + encodeURIComponent("mid,,:" + point) +
    "&key=" + encodeURIComponent(staticMapKey)
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
