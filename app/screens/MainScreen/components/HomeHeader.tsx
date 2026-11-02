import React, { useEffect, useRef } from "react"
import { View, StyleSheet, TouchableOpacity, Animated, Easing, Dimensions } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { useAppTheme } from "@/theme/context"

const { width } = Dimensions.get("window")
export const HEADER_HEIGHT = 260

// 呼吸圆圈组件 (内部使用，不导出)
const BreathingCircle = ({ color, size, top, left, right, bottom, duration, delay }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.2, duration: duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1, duration: duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.3, duration: duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    )
    setTimeout(() => breathe.start(), delay)
  }, [])

  return (
    <Animated.View
      style={{
        position: "absolute",
        top, left, right, bottom,
        width: size, height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
      }}
    />
  )
}

interface HomeHeaderProps {
  user: any
  onNotificationPress: () => void
}

export const HomeHeader = ({ user, onNotificationPress }: HomeHeaderProps) => {
  const { theme: { colors } } = useAppTheme()

  return (
    <View style={[styles.headerBackground, { backgroundColor: colors.primary }]}>
      {/* 呼吸氛围层 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <BreathingCircle color="#27ae98ff" size={200} top={-50} left={-50} duration={4000} delay={0} />
        <BreathingCircle color={colors.tint} size={150} top={20} right={-30} duration={5000} delay={1000} />
        <BreathingCircle color="#9a98d9ff" size={250} top={80} right={20} duration={4000} delay={1500} />
      </View>

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text text={user?.avatarChar || '?'} style={{ fontSize: 20, color: colors.primary, fontWeight: 'bold' }} />
            </View>
            <View>
              <Text text="实时守护中" style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginBottom: 2 }} />
              <Text text={user?.displayName || '加载中...'}
              numberOfLines={1}
              adjustsFontSizeToFit 
              style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  headerBackground: {
    height: HEADER_HEIGHT,
    width: '100%',
    position: 'absolute',
    top: 0,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    zIndex: 0,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)'
  },
  redDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 1, borderColor: 'white' },
})