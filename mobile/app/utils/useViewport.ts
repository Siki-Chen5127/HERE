import { useSyncExternalStore } from "react"
import { Platform, useWindowDimensions } from "react-native"

function subscribe(callback: () => void) {
  if (Platform.OS !== "web" || typeof window === "undefined") return () => {}
  window.addEventListener("resize", callback)
  window.visualViewport?.addEventListener("resize", callback)
  return () => {
    window.removeEventListener("resize", callback)
    window.visualViewport?.removeEventListener("resize", callback)
  }
}

function webWidth() {
  return Platform.OS === "web" && typeof window !== "undefined"
    ? window.innerWidth
    : undefined
}

export function useViewport() {
  const native = useWindowDimensions()
  const width = useSyncExternalStore(subscribe, webWidth, () => undefined)
  return { ...native, width: width ?? native.width }
}
