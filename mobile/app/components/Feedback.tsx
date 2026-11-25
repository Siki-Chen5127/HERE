import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Alert as NativeAlert, Animated, Platform, Pressable, StyleSheet, View } from "react-native"
import type { AlertButton } from "react-native"

import { useReducedMotion } from "@/utils/useReducedMotion"
import { FeedbackPortal } from "./FeedbackPortal"
import { Text } from "./Text"

type Feedback = { title: string; message?: string; kind: "success" | "info" | "error" }
type Confirmation = { title: string; message?: string; buttons: AlertButton[] }
let status: Feedback | null = null
let confirmations: Confirmation[] = []
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function show(title: string, message: string | undefined, kind: Feedback["kind"]) {
  clearTimeout(timer)
  status = { title: title.trim(), message, kind }
  emit()
  timer = setTimeout(() => {
    status = null
    emit()
  }, message ? 3200 : 2000)
}

export const feedback = {
  success: (title: string, message?: string) => show(title, message, "success"),
  info: (title: string, message?: string) => show(title, message, "info"),
  error: (title: string, message?: string) => show(title, message, "error"),
}

export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (!buttons?.length) {
      const kind = /失败|错误|无权|无法|未找到|请检查/.test(title) ? "error" : "info"
      show(title, message, kind)
      return
    }
    if (Platform.OS !== "web") {
      NativeAlert.alert(title, message, buttons)
      return
    }
    confirmations = [...confirmations, { title, message, buttons }]
    emit()
  },
}

export function FeedbackHost() {
  const current = useSyncExternalStore(subscribe, () => status)
  const confirmation = useSyncExternalStore(subscribe, () => confirmations[0])
  const fade = useRef(new Animated.Value(1)).current
  const reduceMotion = useReducedMotion()
  const [confirmMount, setConfirmMount] = useState(0)

  useEffect(() => {
    if (!current || reduceMotion) {
      fade.setValue(1)
      return
    }
    fade.setValue(0)
    const animation = Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true })
    animation.start()
    return () => animation.stop()
  }, [current, fade, reduceMotion])

  if (!current && !confirmation) return null

  const dismiss = (button?: AlertButton) => {
    confirmations = confirmations.slice(1)
    setConfirmMount(value => value + 1)
    emit()
    button?.onPress?.()
  }

  return (
    <FeedbackPortal>
      <View style={styles.layer} pointerEvents="box-none">
        {confirmation && (
          <View key={confirmMount} style={[styles.center, styles.scrim]} accessibilityViewIsModal>
            <View style={styles.panel} accessibilityRole="alert">
              <Text text={confirmation.title} style={styles.title} />
              {confirmation.message && <Text text={confirmation.message} style={styles.message} />}
              <View style={styles.actions}>
                {confirmation.buttons.map(button => (
                  <Pressable key={button.text} accessibilityRole="button" style={[
                    styles.action, button.style === "cancel" && styles.cancel,
                  ]} onPress={() => dismiss(button)}>
                    <Text text={button.text || "确定"} style={button.style === "cancel" ? styles.cancelText : styles.actionText} />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
        {current && (
          <View style={styles.center} pointerEvents="none">
            <Animated.View accessibilityLiveRegion="polite" accessibilityRole="alert"
              style={[styles.panel, styles.status, {
                opacity: fade,
                transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
              }]}
            >
              <View style={[styles.symbol, current.kind === "error" && styles.errorSymbol]}>
                <Text text={current.kind === "success" ? "✓" : current.kind === "error" ? "!" : "i"} style={styles.symbolText} />
              </View>
              <Text text={current.title} style={styles.title} />
              {current.message && <Text text={current.message} style={styles.message} />}
            </Animated.View>
          </View>
        )}
      </View>
    </FeedbackPortal>
  )
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", padding: 20 },
  scrim: { backgroundColor: "rgba(41,52,38,0.31)" },
  panel: {
    width: "100%", maxWidth: 380, backgroundColor: "#fffdf5", borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: "#d5dece", alignItems: "center", gap: 10,
  },
  status: {
    maxWidth: 294, shadowColor: "#334a39", shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 12 }, shadowRadius: 25, elevation: 5,
  },
  symbol: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#dfead9",
    alignItems: "center", justifyContent: "center",
  },
  errorSymbol: { backgroundColor: "#f3ded7" },
  symbolText: { color: "#315b43", fontSize: 27, fontWeight: "700", lineHeight: 35 },
  title: { color: "#233e31", fontSize: 19, fontWeight: "700", textAlign: "center" },
  message: { color: "#526a57", fontSize: 14, lineHeight: 22, textAlign: "center" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 22, backgroundColor: "#325c46" },
  cancel: { backgroundColor: "#e9edde" },
  actionText: { color: "#fffdf5", fontWeight: "600" },
  cancelText: { color: "#315b43", fontWeight: "600" },
})
