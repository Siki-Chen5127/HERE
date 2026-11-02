import React, { useState, useEffect } from "react"
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Linking, 
  Alert, 
  ScrollView 
} from "react-native"
import { CommonActions } from "@react-navigation/native"
// 引用组件：使用相对路径确保能找到组件
import { Text } from "../components/Text"
import { Screen } from "../components/Screen"
import { Icon } from "../components/Icon" 
import { createClientEventId, submitAlert } from "../services/alertSync"
import { getHereApiErrorMessage } from "../services/hereApi"

// 定义阈值：24小时 (毫秒)
const CRITICAL_THRESHOLD = 24 * 60 * 60 * 1000 

export const CriticalAlertScreen = ({ navigation }: any) => {
  // 1. 模拟状态数据
  const [currentTime, setCurrentTime] = useState(new Date())
  const [lastActiveAt, setLastActiveAt] = useState(new Date()) // 默认为当前时间
  const [isCountingDown, setIsCountingDown] = useState(false)
  const [countdown, setCountdown] = useState(10)
  const [isSubmittingMoodRisk, setIsSubmittingMoodRisk] = useState(false)

  // 2. 实时更新当前时间 (每秒刷新)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 3. 计算静默时长
  const silentDuration = currentTime.getTime() - lastActiveAt.getTime()
  const isCritical = silentDuration > CRITICAL_THRESHOLD
  
  // 格式化时间显示
  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${hours}小时 ${minutes}分 ${seconds}秒`
  }

  // 4. 自动触发逻辑 (当满足条件时)
  useEffect(() => {
    if (isCritical && !isCountingDown) {
      // 满足24小时未动，自动触发倒计时
      startEmergencyProcedure()
    }
  }, [isCritical])

  // 5. 倒计时逻辑
  useEffect(() => {
    let interval: any
    if (isCountingDown && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(c => c - 1)
      }, 1000)
    } else if (countdown === 0 && isCountingDown) {
      // 倒计时结束，执行拨号
      callPolice()
      setIsCountingDown(false)
    }
    return () => clearInterval(interval)
  }, [isCountingDown, countdown])

  const startEmergencyProcedure = () => {
    setIsCountingDown(true)
    setCountdown(10) // 重置倒计时
  }

  const stopEmergencyProcedure = () => {
    setIsCountingDown(false)
    setLastActiveAt(new Date()) // 重置活跃时间为现在
    Alert.alert("已解除", "检测到用户活跃，警报解除。")
  }

  const callPolice = () => {
    const phoneNumber = '110'
    Linking.canOpenURL(`tel:${phoneNumber}`)
      .then((supported) => {
        if (!supported) {
          Alert.alert("??", "?????????????")
          return undefined
        }
        return Linking.openURL(`tel:${phoneNumber}`)
      })
      .catch((err) => console.error("????", err))
  }

  // emergency simulation buttons
  
  const simulateSafe = () => {
    const t = new Date()
    t.setHours(t.getHours() - 23)
    setLastActiveAt(t)
    setIsCountingDown(false)
  }

  // 模拟时光倒流 25小时 (危险)
  const simulateDanger = () => {
    const t = new Date()
    t.setHours(t.getHours() - 25)
    setLastActiveAt(t)
  }

  const simulateMoodRisk = async () => {
    if (isSubmittingMoodRisk) return
    setIsSubmittingMoodRisk(true)
    try {
      const result = await submitAlert({
        client_event_id: createClientEventId("mood-risk"),
        category: "mood_risk",
        severity: "high",
        description: "测试场景：学生连续多日情绪低落，社会功能明显下降并出现高风险表达。",
      })
      Alert.alert(
        "心境风险预警",
        result.delivery === "sent"
          ? "预警已提交，电脑端将出现新的高等级工单。"
          : "网络暂不可用，预警已保存到离线队列。",
      )
    } catch (error) {
      Alert.alert("预警提交失败", getHereApiErrorMessage(error))
    } finally {
      setIsSubmittingMoodRisk(false)
    }
  }

  return (
    <Screen 
      preset="scroll" 
      safeAreaEdges={['top', 'bottom']} 
      style={isCountingDown ? styles.containerAlert : styles.containerSafe}
    >
      <View style={styles.header}>
        <Text style={styles.title} text="失联告警模拟" />
        <Text style={styles.subtitle} text="检测是否有24小时无轨迹变化" />
      </View>

      {/* --- 1. 数据监控面板 --- */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label} text="当前时间:" />
          <Text style={styles.value} text={currentTime.toLocaleTimeString()} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label} text="最后活跃:" />
          <Text style={styles.value} text={lastActiveAt.toLocaleString()} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label} text="静默时长:" />
          <Text 
            style={[styles.valueBig, isCritical ? {color: '#EF4444'} : {color: '#10B981'}]} 
            text={formatTime(silentDuration)} 
          />
        </View>
        <View style={styles.row}>
          <Text style={styles.label} text="阈值设定:" />
          <Text style={styles.value} text="24小时 (86400秒)" />
        </View>
        <View style={styles.row}>
          <Text style={styles.label} text="当前状态:" />
          <Text 
            style={[styles.statusTag, isCritical ? styles.tagDanger : styles.tagSafe]} 
            text={isCritical ? "⚠️ 异常 (超过24h)" : "✅ 正常"} 
          />
        </View>
      </View>

      {/* --- 2. 模拟控制台 --- */}
      <Text style={styles.sectionTitle} text="🛠 开发者模拟控制" />
      <View style={styles.btnGroup}>
        <TouchableOpacity style={[styles.btn, {backgroundColor: '#10B981'}]} onPress={simulateSafe}>
          <Text style={styles.btnText} text="模拟: 23小时没动 (安全)" 
          numberOfLines={1}
        adjustsFontSizeToFit/>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.btn, {backgroundColor: '#F59E0B'}]} onPress={simulateDanger}>
          <Text style={styles.btnText} text="模拟: 25小时没动 (触发!)" 
          numberOfLines={1}
        adjustsFontSizeToFit/>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, {backgroundColor: '#3B82F6'}]} onPress={callPolice}>
          <Text style={styles.btnText} text="测试: 直接拨打 110" 
          numberOfLines={1}
        adjustsFontSizeToFit/>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: "#7C3AED", opacity: isSubmittingMoodRisk ? 0.6 : 1 }]}
            onPress={simulateMoodRisk}
            disabled={isSubmittingMoodRisk}
          >
            <Text
              style={styles.btnText}
              text={isSubmittingMoodRisk ? "正在提交..." : "模拟：心境风险预警"}
              numberOfLines={1}
              adjustsFontSizeToFit
            />
          </TouchableOpacity>
        )}
      </View>

      {/* --- 3. 告警弹窗 (模拟全屏覆盖) --- */}
      {isCountingDown && (
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Icon icon="bell" size={60} color="#EF4444" />
            <Text style={styles.alertTitle} text="检测到长时间静默"
            numberOfLines={1}
        adjustsFontSizeToFit />
            <Text style={styles.alertMsg} text="您已超过 24 小时没有位置移动轨迹，系统判定为异常失联。" />
            
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNum} text={`${countdown}`} 
              adjustsFontSizeToFit/>
              <Text style={styles.countdownLabel} text="秒后自动报警" />
            </View>

            <TouchableOpacity style={styles.imSafeBtn} onPress={stopEmergencyProcedure}>
              <Text style={styles.imSafeText} text="我没事，取消报警" />
            </TouchableOpacity>
          </View>
        </View>
      )}

    </Screen>
  )
}

const styles = StyleSheet.create({
  containerSafe: { flex: 1, backgroundColor: '#F3F4F6' },
  containerAlert: { flex: 1, backgroundColor: '#000000' }, // 告警时变黑底
  
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },

  card: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 15, color: '#6B7280' },
  value: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  valueBig: { fontSize: 20, fontWeight: '900', color: '#10B981' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
  
  statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, overflow: 'hidden', fontWeight: 'bold' },
  tagSafe: { backgroundColor: '#D1FAE5', color: '#059669' },
  tagDanger: { backgroundColor: '#FEE2E2', color: '#EF4444' },

  sectionTitle: { marginLeft: 20, marginTop: 10, fontSize: 14, fontWeight: 'bold', color: '#9CA3AF' },
  btnGroup: { padding: 20, gap: 15 },
  btn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // 告警遮罩层
  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)', // 深色遮罩
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 30,
  },
  alertBox: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  alertTitle: { fontSize: 22, fontWeight: 'bold', color: 'white', marginTop: 20 },
  alertMsg: { fontSize: 16, color: '#9CA3AF', textAlign: 'center', marginTop: 10, lineHeight: 24 },
  
  countdownCircle: {
    marginTop: 30,
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#EF4444',
    justifyContent: 'center', alignItems: 'center',
  },
  countdownNum: { fontSize: 40, fontWeight: 'bold', color: '#EF4444' },
  countdownLabel: { fontSize: 10, color: '#EF4444' },

  imSafeBtn: {
    marginTop: 30,
    backgroundColor: 'white',
    width: '100%',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  imSafeText: { color: '#1F2937', fontWeight: 'bold', fontSize: 18 },
})
