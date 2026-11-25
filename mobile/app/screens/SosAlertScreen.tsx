import { Alert } from "@/components/Feedback"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"
import React, { FC, useEffect, useRef, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Linking,
  Platform,
  StatusBar,
  BackHandler,
  Vibration,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// 🟢 2. 拥抱本地 SQLite
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons"
import { Text } from "@/components/Text" 
import { createClientEventId, submitAlert } from "@/services/alertSync"
import { db } from "@/services/database"
import { getHereApiErrorMessage } from "@/services/hereApi"
import { getCurrentPosition } from "@/services/LocationRecorder"
import { usersRepository } from "@/services/database/repositories"
import { colors } from "@/theme/colors"

// --- 颜色配置 (优化版) ---
const SOS_COLORS = {
  redCore: '#DC2626',   // 警示红
  redLight: '#FEE2E2',  // 浅红背景
  redDark: '#991B1B',   // 深红（用于按钮按下）
  
  blueCore: '#2563EB',  // 辅助蓝
  blueBg: '#EFF6FF',
  
  white: '#FFFFFF',
  textMain: '#1F2937',
  textSub: '#6B7280',
  backdrop: 'rgba(0, 0, 0, 0.85)', // 倒计时遮罩层颜色
}

// --- 子组件：倒计时遮罩层 ---
const CountdownOverlay = ({ visible, count, onCancel, onCallNow }: any) => {
  if (!visible) return null
  
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayContainer]}>
      <View style={styles.overlayContent}>
        <Text style={styles.overlayTitle} text="正在自动呼救" 
        numberOfLines={1} 
        adjustsFontSizeToFit/>
        <View style={styles.countdownCircle}>
           <Text style={styles.countdownNumber} text={String(count)} />
        </View>
        <Text style={styles.overlaySub} text="秒后自动拨打 110" />
        
        <View style={styles.overlayBtnGroup}>
          <TouchableOpacity style={styles.overlayBtnCancel} onPress={onCancel}>
            <Text style={styles.overlayBtnTextCancel} text="取消呼叫" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.overlayBtnCall} onPress={onCallNow}>
             <Text style={styles.overlayBtnTextCall} text="立即拨打" 
             numberOfLines={1} 
             adjustsFontSizeToFit/>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

export const SosAlertScreen: FC<any> = ({ navigation }) => {
  const { width, fontScale } = useViewport()
  const wide = width >= 900 && fontScale < 1.3
  const insets = useSafeAreaInsets()
  
  // 状态管理
  const [alertId, setAlertId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<any[]>([])
  
  // 智能文本显示状态
  const [notifyStatus, setNotifyStatus] = useState("正在定位...")
  const [contactSummary, setContactSummary] = useState("正在获取联系人...")
  const [isContactsExpanded, setIsContactsExpanded] = useState(false)

  // 倒计时状态
  const [showCountdown, setShowCountdown] = useState(true) // 默认开启
  const [countdown, setCountdown] = useState(5)
  
  const timerRef = useRef<any>(null)
  const pulseAnim = useRef(new Animated.Value(0)).current
  const clientEventIdRef = useRef(createClientEventId("sos"))

  // 🟢 4. 初始化：建立本地报警日志表
  useEffect(() => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS AlertLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          type TEXT,
          status TEXT,
          latitude REAL,
          longitude REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch (e) {
      console.log("报警记录表初始化失败", e);
    }
  }, []);

  useEffect(() => {
    startPulseAnimation()
    handleBackgroundLogic()
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true)

    return () => {
      backHandler.remove()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // --- 倒计时逻辑 ---
  useEffect(() => {
    if (showCountdown && countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev: number) => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleCountdownFinish()
            return 0
          }
          Vibration.vibrate(50) 
          return prev - 1
        })
      }, 1000)
    }
    return () => { 
        if(timerRef.current) clearInterval(timerRef.current) 
    }
  }, [showCountdown])

  const handleCountdownFinish = () => {
    setShowCountdown(false)
    Linking.openURL('tel:110')
  }

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setShowCountdown(false)
  }

  // --- 核心业务逻辑 ---
  const handleBackgroundLogic = async () => {
    try {
      // 🟢 5. 从本地查询当前用户
      const activeUser = usersRepository.getActiveUser()
      if (!activeUser) throw new Error("未找到当前登录用户")
      const userId = String(activeUser.id)

      // A. 获取联系人并生成摘要 (本地)
      try {
        const results = db.getAllSync<{name: string, phone: string}>(
          'SELECT name, phone FROM EmergencyContact WHERE ownerId = ?',
          userId
        )
        setContacts(results)

        if (results.length > 0) {
          const names = results.map(c => c.name).join(', ')
          
          if (results.length > 2) {
             setContactSummary(`已通知 ${results.length} 位守护者 (点击展开)`)
          } else {
             setContactSummary(`已通知: ${names}`)
             setIsContactsExpanded(true) 
          }
        } else {
          setContactSummary("未设置紧急联系人")
        }
      } catch (err) {
        console.warn(err)
      }

      // B. 获取定位
      let locationObj: { latitude: number; longitude: number } | null = null
      try {
        locationObj = await getCurrentPosition()
        setNotifyStatus("定位成功，正在向协同平台提交预警...")
      } catch (e) { 
        setNotifyStatus("定位超时，仍将提交不含位置的紧急预警...")
      }

      // C. 记录 AlertLog (本地)
      try {
        const result = db.runSync(
          'INSERT INTO AlertLog (userId, type, status, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
          userId, 'sos', 'active', locationObj?.latitude ?? null, locationObj?.longitude ?? null
        )
        setAlertId(String(result.lastInsertRowId))
      } catch (e) {
        console.warn("保存报警日志失败", e)
      }

      try {
        const result = await submitAlert({
          client_event_id: clientEventIdRef.current,
          category: "sos",
          severity: "critical",
          description: "学生通过 HERE 移动端触发 SOS 紧急求助",
          latitude: locationObj?.latitude,
          longitude: locationObj?.longitude,
        })
        setNotifyStatus(
          result.delivery === "sent"
            ? "预警已提交，电脑端已生成紧急工单"
            : "网络暂不可用，预警已进入离线队列",
        )
      } catch (error) {
        setNotifyStatus(getHereApiErrorMessage(error, "预警上传失败，请重新登录后再试"))
      }

    } catch (error) {
      console.error(error)
      setNotifyStatus("系统异常，请直接拨号")
    }
  }

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.circle),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ).start()
  }

  // --- 发送短信逻辑 ---
  const sendSmsToContacts = async () => {
    if (contacts.length === 0) {
        Alert.alert("无联系人", "请直接拨打110")
        return
    }
    const separator = Platform.OS === 'ios' ? '&' : ','
    const phoneNumbers = contacts.map(c => c.phone).join(separator)
    const message = `【紧急求助】我遇到了危险！当前位置已通过短信发送。请立即报警！`
    const url = `sms:${phoneNumbers}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`
    Linking.openURL(url).catch(() => Alert.alert("错误", "无法调起短信"))
  }

  // --- 退出页面逻辑 ---
  const handleSafeExit = () => {
    Alert.alert(
      "确认安全",
      "确认解除警报状态？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "我安全了",
          style: "destructive",
          onPress: async () => {
            // 🟢 6. 本地更新日志状态
            if (alertId) {
              try {
                db.runSync('UPDATE AlertLog SET status = ? WHERE id = ?', 'resolved', Number(alertId))
              } catch (e) { console.warn(e) }
            }
            navigation.goBack()
          }
        }
      ]
    )
  }

  // --- 渲染部分 (样式全留，只修改数据取值方式) ---
  const toggleContactDisplay = () => {
      if (contacts.length > 2) setIsContactsExpanded(!isContactsExpanded)
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor={SOS_COLORS.white} />

      <View style={[styles.workspace, wide && styles.wideWorkspace]}>
      <View style={styles.topSection}>
        <View style={styles.pulseWrapper}>
            <Animated.View style={[styles.ripple, {
                transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
                opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] })
            }]} />
            <Icon name="alert-decagram" size={48} color={SOS_COLORS.redCore} />
        </View>
        
        <Text style={styles.mainTitle} text="SOS 求救中"
        numberOfLines={1}
        adjustsFontSizeToFit />
        
        <TouchableOpacity onPress={toggleContactDisplay} activeOpacity={0.8}>
            <Text style={styles.subTitle}>
                {isContactsExpanded 
                    ? `正在通知: ${contacts.map(c => c.name).join(', ')}` 
                    : contactSummary}
            </Text>
        </TouchableOpacity>
        
        <Text style={styles.statusTiny} text={notifyStatus} />
      </View>

      <View style={[styles.bottomSection, wide && styles.wideActions]}>
        
        <TouchableOpacity 
            style={styles.btnPrimary} 
            onPress={() => Linking.openURL('tel:110')}
            activeOpacity={0.8}
        >
            <Icon name="phone" size={32} color="white" style={{ marginRight: 12 }} />
            <View>
                <Text style={styles.btnPrimaryText} text="拨打 110" />
                <Text style={styles.btnPrimarySub} text="极速报警通道" />
            </View>
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.btnSecondary} 
            onPress={sendSmsToContacts}
        >
            <Icon name="message-text-outline" size={24} color={SOS_COLORS.blueCore} style={{ marginRight: 10 }} />
            <Text style={styles.btnSecondaryText} text="发送定位短信" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnExit} onPress={handleSafeExit}>
            <Text style={styles.textExit} text="我已安全，解除警报" />
        </TouchableOpacity>

      </View>
      </View>

      <CountdownOverlay 
        visible={showCountdown} 
        count={countdown} 
        onCancel={cancelCountdown}
        onCallNow={handleCountdownFinish}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  workspace: { flex: 1 },
  wideWorkspace: { ...studentFrame, flexDirection: "row", alignItems: "center", gap: 26 },
  wideActions: { flex: 1, padding: 24, backgroundColor: ui.surface, borderRadius: ui.radius.feature,
    borderColor: ui.line, borderWidth: 1, marginBottom: 0 },
  container: { flex: 1, backgroundColor: ui.canvas, paddingHorizontal: 24 },
  topSection: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  pulseWrapper: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  ripple: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: SOS_COLORS.redLight },
  mainTitle: { fontSize: 28, fontWeight: '900', color: SOS_COLORS.textMain, marginBottom: 8 },
  subTitle: { fontSize: 16, color: SOS_COLORS.blueCore, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  statusTiny: { fontSize: 12, color: SOS_COLORS.textSub },

  bottomSection: { flex: 0, paddingBottom: 40, gap: 16 },
  
  btnPrimary: {
    backgroundColor: SOS_COLORS.redCore, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 24, borderRadius: 16,
    shadowColor: SOS_COLORS.redCore, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  btnPrimaryText: { color: 'white', fontSize: 24, fontWeight: 'bold', lineHeight: 30, includeFontPadding: false },
  btnPrimarySub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  btnSecondary: {
    backgroundColor: SOS_COLORS.blueBg, borderWidth: 1, borderColor: '#BFDBFE',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, borderRadius: 16,
  },
  btnSecondaryText: { color: SOS_COLORS.blueCore, fontSize: 18, fontWeight: '600' },

  btnExit: { alignItems: 'center', marginTop: 8, padding: 12 },
  textExit: { color: SOS_COLORS.textSub, fontSize: 15, textDecorationLine: 'underline' },

  overlayContainer: { backgroundColor: SOS_COLORS.backdrop, zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  overlayContent: { width: '80%', alignItems: 'center' },
  overlayTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 30 },
  countdownCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: SOS_COLORS.redCore,
    justifyContent: 'center', alignItems: 'center', marginBottom: 30, backgroundColor: 'rgba(220, 38, 38, 0.2)',
  },
  countdownNumber: {
    color: SOS_COLORS.redCore, fontSize: 64, fontWeight: 'bold', lineHeight: 80,
    includeFontPadding: false, textAlign: "center", textAlignVertical: "center",
  },
  overlaySub: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 50 },
  overlayBtnGroup: { flexDirection: 'row', gap: 20, width: '100%' },
  overlayBtnCancel: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  overlayBtnTextCancel: { color: 'white', fontSize: 18, fontWeight: '600' },
  overlayBtnCall: { flex: 1, backgroundColor: SOS_COLORS.redCore, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  overlayBtnTextCall: { color: 'white', fontSize: 18, fontWeight: 'bold' }
})
