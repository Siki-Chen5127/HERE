import React, { PropsWithChildren } from "react"
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native"
import { LinearGradient } from "expo-linear-gradient"

type GlassSurfaceProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
  green?: boolean
}>

/** Optical frost without a new native module: translucent fill and edge light. */
export function GlassSurface({ children, style, contentStyle, green }: GlassSurfaceProps) {
  return (
    <View style={[styles.shadow, style]}>
      <View style={[styles.surface, green && styles.green, contentStyle]}>
        <LinearGradient
          pointerEvents="none"
          colors={
            green
              ? ["rgba(227,242,210,0.27)", "rgba(255,255,255,0.03)", "rgba(196,223,184,0.14)"]
              : ["rgba(255,255,255,0.63)", "rgba(255,255,255,0.22)", "rgba(255,255,255,0.4)"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 24,
    shadowColor: "#344E35",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  surface: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "rgba(248,250,240,0.48)",
  },
  green: { backgroundColor: "rgba(47,100,74,0.94)", borderColor: "rgba(239,249,222,0.8)" },
})
