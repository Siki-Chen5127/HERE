import { useEffect, useRef } from "react"
import type { ReactNode } from "react"
import { Animated, Platform, StyleSheet } from "react-native"
import { useIsFocused } from "@react-navigation/native"

import { useReducedMotion } from "@/utils/useReducedMotion"

export function RouteMotion({ children }: { children: ReactNode }) {
  const focused = useIsFocused()
  const reduced = useReducedMotion()
  const progress = useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (!focused || reduced || Platform.OS !== "web") {
      progress.setValue(1)
      return
    }
    progress.setValue(0)
    const animation = Animated.timing(progress, { toValue: 1, duration: 250, useNativeDriver: true })
    animation.start()
    return () => animation.stop()
  }, [focused, progress, reduced])
  return <Animated.View style={[styles.screen, { opacity: progress,
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }] }]}>{children}</Animated.View>
}

const styles = StyleSheet.create({ screen: { flex: 1, minHeight: 0 } })
