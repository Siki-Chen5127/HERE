import React, { useState, useEffect, useRef } from "react"
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  StatusBar,
  Animated,
  Easing
} from "react-native"
// 修正引用路径
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import { Icon } from "../components/Icon" 

export const FallAlertScreen = ({ navigation }: any) => {
  const [seconds, setSeconds] = useState(10)
  const [isActive, setIsActive] = useState(true)
  
  // 动画值：用于呼吸灯效果
  const pulseAnim = useRef(new Animated.Value(1)).current

  // 1. 倒计时逻辑
  useEffect(() => {
    let interval: any

    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((prev) => prev - 1)
      }, 1000)
    } else if (seconds === 0) {
      handleSOS()
    }

    return () => clearInterval(interval)
  }, [isActive, seconds])

  // 2. 呼吸灯动画逻辑
  useEffect(() => {
    if (!isActive) return

    const startPulse = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.ease,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
            easing: Easing.ease,
          })
        ])
      ).start()
    }
    startPulse()
  }, [isActive])

  // 3. 触发报警
  const handleSOS = () => {
    setIsActive(false)
    // 模拟震动反馈
    Alert.alert(
      "🚨 正在呼救", 
      "系统已自动拨打紧急联系人电话，并发送了您的当前位置。", 
      [{ text: "关闭", onPress: () => navigation.goBack() }]
    )
  }

  // 4. 取消报警
  const handleCancel = () => {
    setIsActive(false)
    Alert.alert("已取消报警", "很高兴您平安无事。系统将继续监测。", [
      { text: "返回首页", onPress: () => navigation.goBack() }
    ])
  }

  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top', 'bottom']} 
      style={styles.screen}
      contentContainerStyle={styles.screenContent} // 关键修复：确保内容撑满
    >
      <StatusBar barStyle="light-content" backgroundColor="#EF4444" />

      <View style={styles.container}>
        {/* 顶部警示图标 */}
        <View style={styles.iconContainer}>
          <Icon icon="alert" size={48} color={null} />
          <Text style={styles.warningText} text="检测到跌倒/撞击！" />
          <Text style={styles.subText} text="系统将在倒计时结束后自动报警" />
        </View>

        {/* 倒计时核心区域 */}
        <View style={styles.timerWrapper}>
          {/* 呼吸光环动画 */}
          <Animated.View 
            style={[
              styles.pulseCircle, 
              { transform: [{ scale: pulseAnim }] }
            ]} 
          />
          <View style={styles.timerCircle}>
            <Text style={styles.timerNum} text={`${seconds}`} />
            <Text style={styles.timerUnit} text="秒" />
          </View>
        </View>

        {/* 底部按钮组 */}
        <View style={styles.btnGroup}>
          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText} text="我没事 (取消报警)" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.sosBtn} 
            onPress={handleSOS}
            activeOpacity={0.8}
          >
            <Text style={styles.sosText} text="立即呼救" />
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EF4444', // 警示红底色
  },
  screenContent: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // 顶部
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  warningText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    letterSpacing: 1,
  },
  subText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },

  // 倒计时区域
  timerWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    height: 200,
    width: 200,
  },
  pulseCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.2)', // 半透明白光
  },
  timerCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  timerNum: {
    fontSize: 80,
    fontWeight: '900',
    color: '#EF4444',
    lineHeight: 90, // 调整行高对齐
    fontVariant: ['tabular-nums'], // 等宽数字，防止抖动
  },
  timerUnit: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: 'bold',
    marginTop: -5,
  },

  // 状态提示
  statusBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  gpsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },

  // 按钮组
  btnGroup: {
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  cancelBtn: {
    backgroundColor: 'white',
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'black',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 2,
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 20,
    fontWeight: 'bold',
  },
  sosBtn: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sosText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  }
})