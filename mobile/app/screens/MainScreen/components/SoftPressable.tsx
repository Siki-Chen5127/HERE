import React, { useEffect, useRef } from "react"
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from "react-native"
import { useReducedMotion } from "@/utils/useReducedMotion"

type SoftPressableProps = Omit<PressableProps, "style" | "children"> & {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}

export function SoftPressable({
  children,
  style,
  onPressIn,
  onPressOut,
  ...props
}: SoftPressableProps) {
  const scale = useRef(new Animated.Value(1)).current
  const reduceMotion = useReducedMotion()
  useEffect(() => {
    if (reduceMotion) {
      scale.stopAnimation()
      scale.setValue(1)
    }
  }, [reduceMotion, scale])
  const animate = (toValue: number) => {
    if (reduceMotion) return
    Animated.spring(scale, { toValue, speed: 30, bounciness: 2, useNativeDriver: true }).start()
  }
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          animate(0.975)
          onPressIn?.(event)
        }}
        onPressOut={(event) => {
          animate(1)
          onPressOut?.(event)
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  )
}
