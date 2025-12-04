import React, { FC, useEffect, useRef, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ViewStyle,
  TextStyle,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  Dimensions
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import AV from "leancloud-storage/core"
import { Text } from "@/components/Text"
import { getCurrentPosition } from "@/services/LocationRecorder"

const { width } = Dimensions.get('window')

const COLORS = {
  white: '#FFFFFF',
  red500: '#EF4444', 
  red600: '#DC2626',
  red50: '#FEF2F2',
  primary: '#10B981', 
  textMain: '#1F2937',
  textSub: '#6B7280',
  blue50: '#EFF6FF',
  blue600: '#2563EB',
}

export const SosAlertScreen: FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets()
  const [alertId, setAlertId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<any[]>([]) 
  const [notifyStatus, setNotifyStatus] = useState("正在定位并通知守护者...")
  
  // 安全的 JS 驱动动画值
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    startPulseAnimation()
    handleEmergencyFlow()

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true)
    return () => {
      scaleAnim.stopAnimation()
      backHandler.remove()
    }
  }, [])

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 1000, useNativeDriver: false, easing: Easing.out(Easing.ease) }),
          Animated.timing(scaleAnim, { toValue: 1, duration: 1000, useNativeDriver: false, easing: Easing.in(Easing.ease) }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
          Animated.timing(opacityAnim, { toValue: 0.3, duration: 1000, useNativeDriver: false }),
        ])
      ])
    ).start()
  }

  const handleEmergencyFlow = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      
      // 1. 获取联系人
      try {
        const query = new AV.Query('EmergencyContact')
        query.equalTo('owner', currentUser)
        const results = await query.find()
        setContacts(results) 

        if (results.length > 0) {
          const names = results.map(c => c.get('name')).join(', ')
          setNotifyStatus(`已准备通知: ${names}`)
        } else {
          setNotifyStatus("未设置联系人，请直接拨打110")
        }
      } catch (contactError) {
        setNotifyStatus("获取联系人失败")
      }

      // 2. 定位 & 上传
      let locationObj = { latitude: 30.505504, longitude: 114.341492 } 
      try {
        locationObj = await getCurrentPosition()
      } catch (e) { console.log("定位超时") }

      const alertObject = new AV.Object('AlertLog')
      alertObject.set('user', currentUser)
      alertObject.set('type', 'sos')      
      alertObject.set('status', 'active') 
      const geoPoint = new AV.GeoPoint(locationObj.latitude, locationObj.longitude)
      alertObject.set('location', geoPoint)
      
      const savedAlert = await alertObject.save()
      setAlertId(savedAlert.id || null)

      // 3. 延迟提示
      setTimeout(() => {
        Alert.alert(
          "即将呼叫 110",
          "是否立即拨打报警电话？",
          [
            { text: "取消", style: "cancel" },
            { text: "呼叫", onPress: () => Linking.openURL('tel:110') }
          ]
        )
      }, 3000)

    } catch (error) {
      setNotifyStatus("网络错误，请手动拨号")
    }
  }

  const sendSmsToContacts = async () => {
    if (contacts.length === 0) {
      Alert.alert("提示", "未获取到紧急联系人，请直接拨打110")
      return
    }
    
    const currentUser = await AV.User.currentAsync()
    const username = currentUser ? currentUser.getUsername() : '我'
    const phoneNumbers = contacts.map(c => c.get('phone')).join(Platform.OS === 'ios' ? '&' : ',')
    const message = `【紧急求助】我是${username}，我遇到了危险！请帮帮我！`
    const url = `sms:${phoneNumbers}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`

    Linking.openURL(url).catch(err => Alert.alert("错误", "无法打开短信应用"))
  }

  const handleCancel = () => {
    Alert.alert(
      "解除警报", 
      "确认您现在已经安全了吗？", 
      [
        { text: "取消", style: "cancel" },
        {
          text: "我安全了",
          style: "default",
          onPress: async () => {
            if (alertId) {
              const alertObject = AV.Object.createWithoutData('AlertLog', alertId)
              alertObject.set('status', 'resolved')
              alertObject.save().catch(console.warn) 
            }
            navigation.goBack()
          }
        }
      ]
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <View style={styles.content}>
        
        {/* 呼吸动画图标 */}
        <View style={styles.iconContainer}>
          <Animated.View style={[
            styles.pulseCircle, 
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim }
          ]} />
          {/* 修复：显式设置 lineHeight 和 padding 解决 Emoji 截断 */}
          <Text style={{ fontSize: 60, lineHeight: 75, textAlign: 'center' }}>🚨</Text> 
        </View>

        {/* 修复：给标题增加 lineHeight 和 padding，防止大字体被切 */}
        <Text 
          style={styles.title} 
          text="SOS 已触发 !" 
          adjustsFontSizeToFit
          numberOfLines={1}
        />
        
        <View style={styles.statusBox}>
          <Text style={styles.subTitle} text="正在呼叫 110..." />
          <Text 
            style={styles.statusText} 
            text={notifyStatus} 
            numberOfLines={2} 
            adjustsFontSizeToFit
          />
        </View>
        
        {/* 按钮区：自适应宽度和高度 */}
        <View style={styles.btnGroup}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: COLORS.red50, borderColor: '#FEE2E2' }]} 
            onPress={() => Linking.openURL('tel:110')}
          >
            <Text style={{ fontSize: 24, marginRight: 12 }}>📞</Text>
            {/* 核心修复：添加 flex: 1，允许文字占据剩余空间 */}
            <View style={{ flex: 1 }}>
              <Text 
                style={{ color: COLORS.red600, fontWeight: 'bold', fontSize: 18 }} 
                text="立即拨打 110" 
                adjustsFontSizeToFit 
                numberOfLines={1}
              />
              <Text 
                style={{ color: COLORS.red600, fontSize: 12, opacity: 0.7 }} 
                text="警察将在第一时间协助您" 
                numberOfLines={1}
                adjustsFontSizeToFit
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: COLORS.blue50, borderColor: '#DBEAFE' }]} 
            onPress={sendSmsToContacts}
          >
            <Text style={{ fontSize: 24, marginRight: 12 }}>💬</Text>
            {/* 核心修复：添加 flex: 1 */}
            <View style={{ flex: 1 }}>
              <Text 
                style={{ color: COLORS.blue600, fontWeight: 'bold', fontSize: 18 }} 
                text="发送求助短信" 
                adjustsFontSizeToFit 
                numberOfLines={1} 
              />
              <Text 
                style={{ color: COLORS.blue600, fontSize: 12, opacity: 0.7 }} 
                text="包含您的实时位置和求救信息" 
                numberOfLines={1}
                adjustsFontSizeToFit
              />
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.cancelBtn} 
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text 
            style={styles.cancelBtnText} 
            text="我安全了，取消求助" 
            adjustsFontSizeToFit
            numberOfLines={1}
          />
        </TouchableOpacity>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24, // 稍微减小边距，给内容更多空间
  },
  
  iconContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  pulseCircle: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(239, 68, 68, 0.2)', 
  },

  title: {
    fontSize: 36, 
    fontWeight: '800',
    color: COLORS.red600,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },

  statusBox: {
    alignItems: 'center',
    marginBottom: 40,
    width: '100%',
  },
  subTitle: {
    fontSize: 20, 
    color: COLORS.textMain,
    marginBottom: 8,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 15, 
    color: COLORS.textSub,
    textAlign: 'center',
    width: '100%',
  },

  btnGroup: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  actionBtn: {
    width: '100%', // 强制满宽
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 20, 
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },

  cancelBtn: {
    width: '100%', // 强制满宽
    backgroundColor: COLORS.primary, 
    paddingVertical: 18, 
    borderRadius: 30,     
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4, 
  },
  cancelBtnText: {
    color: COLORS.white,
    fontSize: 18, 
    fontWeight: 'bold', 
  },
})