import { feedback } from "@/components/Feedback"
import React, { FC, useCallback, useEffect, useState, useRef } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  ViewStyle,
  TextStyle,
  BackHandler,
  StatusBar,
  ScrollView // 引入 ScrollView 防止小屏手机内容显示不全
} from "react-native"
// 引入安全区域钩子，精确控制顶部距离
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { useReducedMotion } from "@/utils/useReducedMotion"
import { studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"


const COLORS = {
  bg: "#87523e",
  white: '#FFFFFF',
  darkRed: '#7F1D1D',
}

export const RescueCheckScreen: FC<any> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets() // 获取安全区域
  const reducedMotion = useReducedMotion()
  const { width } = useViewport()
  const rehearsal = route.params?.rehearsal === true
  const [countdown, setCountdown] = useState(60) 
  const fadeAnim = useRef(new Animated.Value(0)).current
  const handleTimeout = useCallback(() => {
    if (rehearsal) {
      navigation.goBack()
      feedback.info("夜间平安演练已完成", "本次未发起紧急求助。")
      return
    }
    navigation.replace("SosAlert")
  }, [navigation, rehearsal])

  useEffect(() => {
    if (reducedMotion) {
      fadeAnim.setValue(1)
      return
    }
    const fade = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    })
    fade.start()
    return () => fade.stop()
  }, [fadeAnim, reducedMotion])

  useEffect(() => {
    const vibeInterval = setInterval(() => {
      Vibration.vibrate(500)
    }, 2000)

    const timer = setInterval(() => setCountdown(current => Math.max(0, current - 1)), 1000)

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true)

    return () => {
      clearInterval(timer)
      clearInterval(vibeInterval)
      backHandler.remove()
    }
  }, [])

  useEffect(() => {
    if (countdown === 0) handleTimeout()
  }, [countdown, handleTimeout])

  const handleAlive = () => {
    navigation.goBack()
    feedback.success("已确认平安")
  }

  const handleSleep = () => {
    navigation.goBack()
    feedback.success("已结束本次提醒", "晚安，好好休息。")
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      
      {/* 使用 ScrollView 确保小屏手机也能完整显示，contentContainerStyle 设置 flexGrow 保证内容居中 */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        
        <Animated.View style={[styles.stage, width >= 900 && styles.desktopStage, { opacity: fadeAnim }]}>
          {/* 修复：使用你指定的样式，减小图标并调整边距，避免遮挡 */}
          <Icon icon="check" size={58} color={COLORS.white} />
          
          <Text style={styles.title} text="夜间平安提醒" />
          <Text style={styles.subtitle} text={rehearsal ? "查看提醒流程。演练不会发出紧急通知。" : "还在忙吗？请确认你目前平安。"} />
          
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>{countdown.toString()}</Text>
            <Text style={styles.timerLabel} text={rehearsal ? "秒后结束演练" : "秒后启动紧急求助"} />
          </View>

          <View style={styles.btnGroup}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSleep}>
              <Text 
                style={styles.btnPrimaryText} 
                text="我要休息了" 
                adjustsFontSizeToFit 
                numberOfLines={1} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={handleAlive}>
              <Text 
                style={styles.btnSecondaryText} 
                text="我现在平安"
                adjustsFontSizeToFit
                numberOfLines={1}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  stage: { alignItems: "center", width: "100%", maxWidth: 550 },
  desktopStage: { backgroundColor: "#734535", padding: 35, borderRadius: ui.radius.feature, borderWidth: 1, borderColor: "#af816a" },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  
  scrollContent: {
    flexGrow: 1, // 关键：让 ScrollView 内容即使不足一屏也能居中
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40, // 底部留白
  },
  
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 16,
    textAlign: 'center', // 确保多行时居中
  },
  
  subtitle: {
    fontSize: 16, 
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 30, // 稍微减小间距
    lineHeight: 24,
  },
  
  timerBox: {
    alignItems: 'center',
    marginBottom: 50, // 稍微减小间距
    justifyContent: 'center',
  },
  
  timerText: {
    fontSize: 80,
    fontWeight: 'bold',
    color: COLORS.white,
    lineHeight: 90, // 紧凑行高
    textAlign: 'center',
  },
  
  timerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 0,
  },
  
  btnGroup: {
    width: '100%',
    gap: 16,
  },
  
  btnPrimary: {
    backgroundColor: COLORS.white,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
    elevation: 3,
  },
  
  btnPrimaryText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  btnSecondary: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    width: '100%',
  },
  
  btnSecondaryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
})
