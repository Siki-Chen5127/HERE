import React, { FC, useEffect, useState, useRef } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Vibration,
  ViewStyle,
  TextStyle,
  BackHandler,
  StatusBar,
  Dimensions,
  ScrollView // 引入 ScrollView 防止小屏手机内容显示不全
} from "react-native"
// 引入安全区域钩子，精确控制顶部距离
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/Text"

const { width, height } = Dimensions.get('window')

const COLORS = {
  bg: '#EA580C', // 深橙色
  white: '#FFFFFF',
  darkRed: '#7F1D1D',
}

export const RescueCheckScreen: FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets() // 获取安全区域
  const [countdown, setCountdown] = useState(60) 
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()

    const vibeInterval = setInterval(() => {
      Vibration.vibrate(500)
    }, 2000)

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          handleTimeout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true)

    return () => {
      clearInterval(timer)
      clearInterval(vibeInterval)
      backHandler.remove()
    }
  }, [])

  const handleTimeout = () => {
    navigation.replace("SosAlert")
  }

  const handleAlive = () => {
    Alert.alert("确认存活", "好的，请注意身体，每隔 1 小时我会再来检查一次。", [
      { text: "好的", onPress: () => navigation.goBack() }
    ])
  }

  const handleSleep = () => {
    Alert.alert("晚安", "这才是正确的选择！快去睡觉吧！💤", [
      { text: "再见", onPress: () => navigation.goBack() }
    ])
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
        
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
          {/* 修复：使用你指定的样式，减小图标并调整边距，避免遮挡 */}
          <Text style={{ fontSize: 60, lineHeight: 75, textAlign: 'center' }}>❤️‍🩹</Text> 
          
          <Text style={styles.title} text="心跳检测" />
          <Text style={styles.subtitle} text="现在是深夜，系统检测到您仍在工作。" />
          
          <View style={styles.timerBox}>
            <Text style={styles.timerText}>{countdown.toString()}</Text>
            <Text style={styles.timerLabel} text="秒后自动报警" />
          </View>

          <View style={styles.btnGroup}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleSleep}>
              <Text 
                style={styles.btnPrimaryText} 
                text="我去睡觉了 (推荐)" 
                adjustsFontSizeToFit 
                numberOfLines={1} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={handleAlive}>
              <Text 
                style={styles.btnSecondaryText} 
                text="我还活着，继续卷"
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