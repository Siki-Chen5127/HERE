import React, { FC, useEffect, useState, useCallback, useRef } from "react"
import { View, Alert, Modal, TouchableOpacity, StyleSheet, Platform, Linking } from "react-native"
import * as SQLite from 'expo-sqlite'
import { useFocusEffect } from "@react-navigation/native"
import { Text } from "@/components/Text"
import { createClientEventId, submitAlert } from "@/services/alertSync"
import { usersRepository } from "@/services/database/repositories"
import { getHereApiErrorMessage } from "@/services/hereApi"
import {
  getCachedPosition,
  getProgressivePosition,
  initLocationService,
  LocationPoint,
  startRecordingTrajectory,
} from "@/services/LocationRecorder"
import { colors as themeColors } from "@/theme/colors" 
import { StandardView } from "./StandardView"
import { ElderView } from "./ElderView"
import { homeColors } from "./components/homeAppearance"
import { useScreenChrome } from "@/utils/useScreenChrome"
import { useAuth } from "@/context/AuthContext"

const AMAP_WEB_KEY = process.env.EXPO_PUBLIC_AMAP_WEB_KEY ?? ""

// 3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

export const MainScreen: FC<any> = ({ navigation }) => {
  const { currentUser } = useAuth()
  const [user, setUser] = useState<any>(null)
  const cachedLocation = getCachedPosition()
  const [currentLocation, setCurrentLocation] = useState<LocationPoint | null>(cachedLocation)
  const [locationName, setLocationName] = useState(cachedLocation ? "正在更新位置..." : "定位中...")
  const [updateTime, setUpdateTime] = useState("刚刚")
  const [modalVisible, setModalVisible] = useState(false)
  const [isSubmittingMoodRisk, setIsSubmittingMoodRisk] = useState(false)
  const [timeline, setTimeline] = useState<any[]>([])
  const locationReadyRef = useRef(false)
  const locationRequestInFlightRef = useRef(false)
  const addressRequestIdRef = useRef(0)

  const isElder = user?.role === 'elder'
  const canvasColor = isElder ? themeColors.palette.elder.bg : homeColors.background
  useScreenChrome(canvasColor)

  //  4. 获取当前本地用户的辅助函数 (取最后登录的一个用户)
  const getActiveUserId = () => {
    const activeUser = usersRepository.getActiveUser()
    if (!activeUser) throw new Error("未找到当前登录用户")
    return String(activeUser.id)
  }

  useEffect(() => {
    //  5. 静默初始化需要的表结构，防止查询时崩溃
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ActivityLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          type TEXT,
          address TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS EmergencyContact (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ownerId TEXT,
          phone TEXT
        );
      `);
    } catch (e) { console.log("初始化辅助表失败", e) }

    setupLocationTracking()
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (locationReadyRef.current) fetchLatestLocation()
      fetchUserData()
      fetchActivityTimeline()
    }, [currentUser?.id, currentUser?.name])
  )

  const setupLocationTracking = async () => {
    try {
      const granted = await initLocationService()
      if (!granted) {
        setLocationName("请开启定位权限")
        return
      }
      locationReadyRef.current = true
      await fetchLatestLocation()
      startRecordingTrajectory()
    } catch (e) { console.log("定位服务启动异常", e) }
  }

  const fetchActivityTimeline = async () => {
    try {
      const userId = getActiveUserId()
      //  6. 从 SQLite 获取轨迹日志
      const logs = db.getAllSync<{id: number, address: string, timestamp: string}>(
        "SELECT * FROM ActivityLog WHERE userId = ? AND type = 'trajectory' ORDER BY timestamp DESC LIMIT 3",
        userId
      );
      
      const formattedTimeline = logs.map(log => {
        const timeDate = new Date(log.timestamp)
        return {
          id: log.id,
          location: log.address || "移动中", 
          time: timeDate ? `${timeDate.getHours().toString().padStart(2, '0')}:${timeDate.getMinutes().toString().padStart(2, '0')}` : "未知时间",
          status: 'arrived' 
        }
      })
      setTimeline(formattedTimeline)
    } catch (error) {
      console.error("首页轨迹读取失败", error)
    }
  }

  const applyLocation = (point: LocationPoint) => {
    setCurrentLocation(point)

    const now = new Date()
    setUpdateTime(`${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`)

    const requestId = ++addressRequestIdRef.current
    void (async () => {
      try {
        const response = await fetch(
          `https://restapi.amap.com/v3/geocode/regeo?output=json&location=${point.longitude},${point.latitude}&key=${AMAP_WEB_KEY}&radius=1000&extensions=base`
        )
        const data = await response.json()

        if (requestId !== addressRequestIdRef.current) return
        if (data.status === '1' && data.regeocode?.formatted_address) {
          setLocationName(data.regeocode.formatted_address)
        } else {
          setLocationName(`经度:${point.longitude.toFixed(2)} 纬度:${point.latitude.toFixed(2)}`)
        }
      } catch {
        if (requestId === addressRequestIdRef.current) {
          setLocationName(`经度:${point.longitude.toFixed(2)} 纬度:${point.latitude.toFixed(2)}`)
        }
      }
    })()
  }

  const fetchLatestLocation = async () => {
    if (locationRequestInFlightRef.current) return
    locationRequestInFlightRef.current = true

    try {
      const point = await getProgressivePosition(applyLocation)
      applyLocation(point)
    } catch (e) {
      console.log("位置更新异常", e)
      if (!currentLocation) setLocationName("暂时无法获取位置")
    } finally {
      locationRequestInFlightRef.current = false
    }
  }

  const fetchUserData = async () => {
    try {
      const localUser = usersRepository.getActiveUser()

      if (!localUser) {
        setUser(null)
        return
      }

      const savedName = (
        localUser.realName ||
        currentUser?.name ||
        ""
      ).trim()

      // 旧账号可能把手机号存进名称，避免再次直接展示。
      const displayName =
        savedName && savedName !== localUser.phone
          ? savedName
          : "同学"

      setUser({
        displayName,
        role: localUser.role || "self",
        id: String(localUser.id),
        avatarChar: Array.from(displayName)[0] || "同",
      })
    } catch (error) {
      console.error("读取首页用户信息失败", error)
    }
  }

  const sendSmsToContacts = async (messagePrefix: string) => {
    try {
      if (!currentLocation) {
        Alert.alert("定位中", "尚未取得当前位置，请稍后再试。")
        return
      }
      const userId = getActiveUserId()
      //  8. 从 SQLite 获取紧急联系人
      const contacts = db.getAllSync<{phone: string}>('SELECT phone FROM EmergencyContact WHERE ownerId = ?', userId)

      if (contacts.length === 0) {
        Alert.alert("提示", "您还没有设置紧急联系人，请先去设置。");
        return;
      }

      const phoneNumbers = contacts.map(c => c.phone).filter(p => !!p);

      if (phoneNumbers.length === 0) {
        Alert.alert("提示", "联系人信息中缺少电话号码。");
        return;
      }

      const mapLink = `https://uri.amap.com/marker?position=${currentLocation.longitude},${currentLocation.latitude}&name=我在这里`;
      const smsBody = `${messagePrefix} 当前位置：${locationName}。地图查看：${mapLink}`;
      const separator = Platform.OS === 'android' ? ';' : '&';
      const url = `sms:${phoneNumbers.join(separator)}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(smsBody)}`;

      const supported = await Linking.canOpenURL(url);
      if (supported) { 
        await Linking.openURL(url); 
      } else {
        Alert.alert("错误", "无法调起短信应用");
      }
    } catch (error: any) {
      console.error("操作失败", error);
      Alert.alert("错误", "获取联系人信息失败");
    }
  }

  const handleCheckIn = () => sendSmsToContacts("【HERE】我这里一切安好。");
  const handleNotifyFriend = () => { 
    setModalVisible(false); 
    sendSmsToContacts("【HERE】我今天状态不太好，想和你聊聊。"); 
  }

  const handleOpenMap = async () => {
    if (!currentLocation) {
      Alert.alert("定位中", "尚未取得当前位置，请稍后再试。")
      return
    }
    const lat = currentLocation.latitude;
    const lng = currentLocation.longitude;
    const url = Platform.select({
        ios: `iosamap://viewMap?sourceApplication=HERE&poiname=我的位置&lat=${lat}&lon=${lng}&dev=0`,
        android: `androidamap://viewMap?sourceApplication=HERE&poiname=我的位置&lat=${lat}&lon=${lng}&dev=0`
    });
    if (url) {
        await Linking.openURL(url).catch(() => Linking.openURL(`https://uri.amap.com/marker?position=${lng},${lat}&name=我的位置`));
    }
  }

  const handleSOS = () => navigation.navigate("SosAlert")
  const handleMoodBad = () => setModalVisible(true)
  const handleGoToAi = () => { setModalVisible(false); navigation.navigate("AiChat") }

  const handleMoodRiskTest = async () => {
    if (isSubmittingMoodRisk) return
    if (!currentLocation) {
      Alert.alert("定位中", "尚未取得当前位置，请稍后再试。")
      return
    }
    setIsSubmittingMoodRisk(true)
    try {
      const result = await submitAlert({
        client_event_id: createClientEventId("mood-risk"),
        category: "mood_risk",
        severity: "high",
        description: "测试场景：学生连续多日情绪低落，社会功能明显下降并出现高风险表达。",
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      })
      setModalVisible(false)
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
    <View style={{ flex: 1, backgroundColor: canvasColor }}>
      
      {isElder ? (
        <ElderView 
          navigation={navigation}
          user={user}
          currentLocation={currentLocation}
          locationName={locationName}
          onCheckIn={handleCheckIn}
          onSOS={handleSOS}
        />
      ) : (
        <StandardView 
          navigation={navigation}
          user={user}
          currentLocation={currentLocation}
          locationName={locationName}
          updateTime={updateTime}
          timeline={timeline} 
          onCheckIn={handleCheckIn}
          onMoodBad={handleMoodBad}
          onSOS={handleSOS}
          onOpenMap={handleOpenMap}
          onNotificationPress={() => Alert.alert("通知", "暂无新消息")}
        />
      )}

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text text="需要支持吗？" style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 }} />
                <Text text="请选择您需要的方式" style={{ fontSize: 14, color: '#666', marginBottom: 24 }} />
                
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F3F4F6', marginTop: 12 }]} onPress={handleGoToAi}>
                    <Text 
                      text="和 AI 助手聊聊" 
                      style={{ color: '#333', fontWeight: 'bold', fontSize: 16 }} 
                      numberOfLines={1} 
                      adjustsFontSizeToFit 
                    />
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#F3F4F6', marginTop: 12 }]} onPress={handleNotifyFriend}>
                    <Text 
                      text="发短信给朋友" 
                      style={{ color: '#333', fontSize: 16 }} 
                      numberOfLines={1} 
                      adjustsFontSizeToFit 
                    />
                </TouchableOpacity>

                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#F3E8FF", marginTop: 12 }]}
                    onPress={handleMoodRiskTest}
                    disabled={isSubmittingMoodRisk}
                  >
                    <Text
                      text={isSubmittingMoodRisk ? "正在提交..." : "模拟心境风险预警"}
                      style={{ color: "#6D28D9", fontSize: 16, fontWeight: "bold" }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={{ marginTop: 20, alignItems: 'center', padding: 10 }} onPress={() => setModalVisible(false)}>
                    <Text text="取消" style={{ color: '#999', fontSize: 16 }} />
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { width: '100%', backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalBtn: { width: '100%', padding: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
})
