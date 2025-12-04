import React, { FC, useEffect, useState, useRef, useCallback } from "react"
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform,
  StatusBar,
  Modal, 
  Linking,
  // 暂时移除动画相关引用，确保稳定
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import AV from "leancloud-storage/core"
import { useFocusEffect } from "@react-navigation/native"

import { Text } from "@/components/Text"
//import { MapView, MapType, Marker, AMapSdk, Polyline } from "react-native-amap3d"

import { initLocationService, startRecordingTrajectory, getCurrentPosition } from "@/services/LocationRecorder"

const COLORS = {
  primary: '#10B981', 
  primaryLight: '#D1FAE5', 
  bg: '#F3F4F6', 
  white: '#FFFFFF',
  textMain: '#1F2937',
  textSub: '#6B7280',
  red: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.5)', 
}

const DEFAULT_COORDS = {
  latitude: 30.505504,
  longitude: 114.341492,
}

// 暂时注释掉 PulseMarker，使用默认大头针排查问题
// const PulseMarker = () => { ... }

export const MainScreen: FC<any> = ({ navigation }) => {
  const [user, setUser] = useState<any>(null)
  const [modalVisible, setModalVisible] = useState(false)
  
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_COORDS)
  const [recentTrack, setRecentTrack] = useState<{latitude: number, longitude: number}[]>([]) 
  const [locationName, setLocationName] = useState("正在定位...")
  const [updateTime, setUpdateTime] = useState("刚刚")
  
  

  const [timeline] = useState([
    { id: '1', location: '图书馆', time: '14:20 · 停留中', status: 'arrived', isCurrent: true },
    { id: '2', location: '鉴湖食堂', time: '12:45', status: 'left', isCurrent: false },
  ])

  useEffect(() => {
    initMap()
    fetchUserData()
    setupLocationTracking()
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchLatestLocation()
      fetchUserData()
    }, [])
  )

  const setupLocationTracking = async () => {
    try {
      await initLocationService()
      startRecordingTrajectory() 
    } catch (e) {
      console.log("定位服务启动异常", e)
    }
  }

  const initMap = () => {
    if (Platform.OS === 'android') {
      try {
        // AMapSdk.init(
        //   Platform.select({
        //     android: "644a012082f73b7c01796c0f1d6f6f94",
        //   })
        // )
      } catch (e) { console.log("地图初始化跳过") }
    }
  }

  const fetchLatestLocation = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      let hasCloudData = false

      if (currentUser) {
        const query = new AV.Query('ActivityLog')
        query.equalTo('user', currentUser)
        query.equalTo('type', 'trajectory') 
        query.descending('createdAt')
        query.limit(20)
        
        try {
          const results = await query.find()
          if (results.length > 0) {
            hasCloudData = true
            const latestLog = results[0]
            const loc = latestLog.get('location')
            
            // 严格检查坐标有效性
            if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
              const newCoords = { latitude: loc.latitude, longitude: loc.longitude }
              setCurrentLocation(newCoords)
              
              const time = latestLog.createdAt
              setUpdateTime(time ? `${time.getHours()}:${time.getMinutes().toString().padStart(2, '0')}` : "刚刚")
              setLocationName(`北纬 ${loc.latitude.toFixed(4)}, 东经 ${loc.longitude.toFixed(4)}`)

              const trackPoints = results
                .map(log => log.get('location'))
                .filter(l => l && typeof l.latitude === 'number')
                .map(l => ({ latitude: l.latitude, longitude: l.longitude }))
                .reverse()
              
              setRecentTrack(trackPoints.length > 1 ? trackPoints : [])
              
              // 移动镜头
              
            }
          }
        } catch (dbError) {
          console.log("LeanCloud 查询失败，转入本地兜底")
        }
      }

      if (!hasCloudData) {
        console.log("云端无数据，使用本地定位兜底")
        const point = await getCurrentPosition()
        
        // 严格检查本地坐标
        if (point && typeof point.latitude === 'number' && !isNaN(point.latitude)) {
          const newCoords = { latitude: point.latitude, longitude: point.longitude }
          setCurrentLocation(newCoords)
          setLocationName(`实时: ${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`)
          
          // if (mapRef.current) {
          //   mapRef.current.moveCamera({
          //     target: newCoords,
          //     zoom: 16
          //   }, 1000)
          // }
        }
      }

    } catch (e) {
      console.log("位置更新流程异常", e)
    }
  }

  const fetchUserData = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      if (currentUser) {
        await currentUser.fetch()
        const realName = currentUser.get('realName')
        const username = currentUser.getUsername()
        
        setUser({
          displayName: realName || username || '我', 
          username: username,
          role: currentUser.get('userRole'),
          avatarChar: (realName || username || '?').charAt(0).toUpperCase(),
        })
      }
    } catch (error) { console.error(error) }
  }

  const handleCheckIn = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      let currentLoc = currentLocation
      try {
        const point = await getCurrentPosition()
        currentLoc = { latitude: point.latitude, longitude: point.longitude }
      } catch (e) { /* 使用最后已知位置 */ }

      const log = new AV.Object('ActivityLog')
      log.set('user', currentUser)
      log.set('type', 'check-in')
      log.set('location', new AV.GeoPoint(currentLoc.latitude, currentLoc.longitude))
      log.set('timestamp', new Date())
      await log.save()

      const query = new AV.Query('EmergencyContact')
      query.equalTo('owner', currentUser)
      const contacts = await query.find()

      if (contacts.length === 0) {
        Alert.alert("报平安成功", "位置已记录，但未设置紧急联系人。")
        return
      }

      const phoneNumbers = contacts.map(c => c.get('phone')).join(Platform.OS === 'ios' ? '&' : ',')
      const nameStr = user?.displayName || '我'
      const message = `【报平安】我是${nameStr}，我现在很安全。当前位置：北纬${currentLoc.latitude.toFixed(4)}, 东经${currentLoc.longitude.toFixed(4)}。`
      
      const url = `sms:${phoneNumbers}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`
      
      Linking.openURL(url).catch(() => Alert.alert("提示", "无法自动打开短信，位置已保存。"))

    } catch (e) {
      console.error("报平安失败", e)
      Alert.alert("错误", "报平安记录上传失败")
    }
  }

  const openExternalMap = () => {
    const { latitude, longitude } = currentLocation
    const label = "目标位置"
    const url = Platform.select({
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`,
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`
    })
    if(url) Linking.openURL(url).catch(() => Alert.alert("提示", "未找到地图应用"))
  }

  const handleSOS = () => navigation.navigate("SosAlert")
  const handleMoodBad = () => setModalVisible(true)
  const handleGoToAi = () => { setModalVisible(false); navigation.navigate("AiChat") }
  
  const handleNotifyFriend = async () => {
    setModalVisible(false)
    try {
      const currentUser = await AV.User.currentAsync()
      const query = new AV.Query('EmergencyContact')
      query.equalTo('owner', currentUser)
      const contacts = await query.find()
      
      if (contacts.length === 0) {
        Alert.alert("提示", "请先在“我的”页面添加紧急联系人")
        return
      }

      const phoneNumbers = contacts.map(c => c.get('phone')).join(Platform.OS === 'ios' ? '&' : ',')
      const nameStr = user?.displayName || '我'
      const message = `【状态提醒】我是${nameStr}，我今天心情不太好，如果你有空，可以陪我聊聊吗？`
      
      const url = `sms:${phoneNumbers}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(message)}`
      Linking.openURL(url)
    } catch(e) { console.error(e) }
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.headerContainer}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: 'transparent' }}>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText} text={user?.avatarChar || '?'} />
              </View>
              <View>
                <Text style={styles.userName} text={user?.displayName || '加载中...'} />
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText} text="● 实时守护中" />
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.notificationBtn}>
              <Text style={{ fontSize: 24 }}>🔔</Text>
              <View style={styles.redDot} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true} 
      >
        <View style={styles.mapCard}>
          <View style={{height: 200, backgroundColor: 'gray', justifyContent: 'center', alignItems: 'center'}}>
            <Text>地图暂时屏蔽中</Text>            
            </View>
          <View style={styles.locationFloat}>
            <View style={styles.locationIconBg}>
              <Text style={{ color: COLORS.primary }}>📍</Text>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.locationTitle} text={locationName} numberOfLines={1} />
              <Text style={styles.locationTime} text={`更新: ${updateTime}`} />
            </View>
            <TouchableOpacity style={styles.navButton} onPress={openExternalMap}>
              <Text style={{ fontSize: 18 }}>🧭</Text>
              <Text style={styles.navButtonText} text="导航" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.checkInBtn} onPress={handleCheckIn}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
          <Text style={styles.checkInText} text="一键报平安" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.moodBtn} onPress={handleMoodBad}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>☁️</Text>
          <Text style={styles.moodText} text="我今天状态不佳..." />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sosBtn} onPress={handleSOS}>
          <View style={styles.sosIconContainer}>
            <Text style={{ fontSize: 24, color: 'white' }}>🆘</Text>
          </View>
          <Text style={styles.sosText} text="SOS 紧急求助" />
        </TouchableOpacity>

        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle} text="🧭  今日轨迹" />
            <TouchableOpacity onPress={() => navigation.navigate('Trajectory')}>
              <Text style={styles.moreText} text="查看更多 >" />
            </TouchableOpacity>
          </View>
          <View style={styles.timelineList}>
            <View style={styles.verticalLine} />
            {timeline.map((item) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={[styles.dot, item.isCurrent ? styles.dotActive : styles.dotInactive]} />
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLoc, item.isCurrent ? { color: COLORS.textMain, fontWeight: 'bold' } : { color: COLORS.textSub }]} text={(item.status === 'arrived' ? '到达 ' : '离开 ') + item.location} />
                  <Text style={styles.timelineTime} text={item.time} />
                </View>
              </View>
            ))}
          </View>
        </View>
        
        <View style={{ height: 100 }} /> 
      </ScrollView>

      <Modal animationType="fade" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <Text style={styles.modalTitle} text="需要支持吗？" />
              <Text style={styles.modalSubTitle} text="请选择您需要的方式" />
            </View>
            <View style={{ gap: 12 }}>
              <TouchableOpacity style={styles.aiBtn} onPress={handleGoToAi}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>💬</Text>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }} text="和 AI 助手聊聊" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.friendBtn} onPress={handleNotifyFriend}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>👥</Text>
                <Text style={{ color: COLORS.textMain, fontWeight: 'bold', fontSize: 16 }} text="通知我的朋友 (短信)" />
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, alignItems: 'center' }} onPress={() => setModalVisible(false)}>
                <Text style={{ color: '#9CA3AF' }} text="取消" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: COLORS.bg },
  headerContainer: { backgroundColor: COLORS.primary, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingBottom: 40, paddingHorizontal: 24, zIndex: 10, elevation: 8 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  userName: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  statusBadge: { marginTop: 2 },
  statusText: { color: '#D1FAE5', fontSize: 12, opacity: 0.9 },
  notificationBtn: { padding: 8, position: 'relative' },
  redDot: { position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: COLORS.red, borderRadius: 4, borderWidth: 1, borderColor: COLORS.white },
  scrollView: { flex: 1, marginTop: -30, zIndex: 20 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 0 },
  
  mapCard: { 
    height: 260, 
    backgroundColor: COLORS.white, 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 20, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    elevation: 4, 
    borderWidth: 2, 
    borderColor: COLORS.white, 
    position: 'relative',
  },
  mapView: { flex: 1 },
  locationFloat: { position: 'absolute', bottom: 12, left: 12, right: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  locationIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  locationTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textMain, flexShrink: 1 },
  locationTime: { fontSize: 11, color: COLORS.textSub, marginTop: 2 },
  navButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: '#DBEAFE' },
  navButtonText: { fontSize: 12, color: '#3B82F6', fontWeight: 'bold', marginLeft: 4 },
  checkInBtn: { backgroundColor: COLORS.white, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  checkInText: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  moodBtn: { backgroundColor: COLORS.primaryLight, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#A7F3D0' },
  moodText: { color: '#059669', fontSize: 15, fontWeight: '600' },
  sosBtn: { backgroundColor: COLORS.red, height: 60, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, elevation: 6, shadowColor: COLORS.red, shadowOpacity: 0.3 },
  sosIconContainer: { marginRight: 8 },
  sosText: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  timelineCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  timelineTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain },
  moreText: { fontSize: 12, color: '#9B9B9B' },
  timelineList: { paddingLeft: 4, position: 'relative' },
  verticalLine: { position: 'absolute', left: 5, top: 6, bottom: 20, width: 2, backgroundColor: '#E5E7EB' },
  timelineItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'white', zIndex: 1, marginTop: 2 },
  dotActive: { backgroundColor: COLORS.primary, width: 14, height: 14, left: -1 },
  dotInactive: { backgroundColor: '#D1D5DB' },
  timelineContent: { marginLeft: 12 },
  timelineLoc: { fontSize: 14, marginBottom: 2 },
  timelineTime: { fontSize: 12, color: '#9CA3AF' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  modalContent: { width: '100%', maxWidth: 400, backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 },
  modalSubTitle: { fontSize: 14, color: COLORS.textSub },
  aiBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: COLORS.primaryLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 },
  friendBtn: { backgroundColor: '#F3F4F6', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
})