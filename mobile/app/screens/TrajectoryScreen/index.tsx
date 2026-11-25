import React, { FC, useState, useCallback, useEffect } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Platform,
  BackHandler,
} from "react-native"
import { MapView, MapType, Marker, Polyline } from "react-native-amap3d"
import { AMapWebView } from "@/components/AMapWebView"

// 🟢 2. 引入本地 SQLite
import * as SQLite from 'expo-sqlite'

import { useFocusEffect } from "@react-navigation/native"
import { useAppTheme } from "@/theme/context"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { usersRepository } from "@/services/database/repositories"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"

const { width } = Dimensions.get('window')

// 🟢 3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

export const TrajectoryScreen: FC<any> = ({ navigation }) => {
  const { theme: { colors: appColors, isDark } } = useAppTheme()
  const colors = isDark ? appColors : { ...appColors, background: ui.canvas, surface: ui.surface, border: ui.line, primary: ui.primary, text: ui.ink }
  const { width: viewportWidth, fontScale } = useViewport()
  const desktop = viewportWidth >= 900 && fontScale < 1.3
  const [loading, setLoading] = useState(true)
  const [groupedData, setGroupedData] = useState<any[]>([])

  // 🟢 4. 获取当前用户的本地 ID
  const getActiveUserId = () => {
    const activeUser = usersRepository.getActiveUser()
    if (!activeUser) throw new Error("未找到当前登录用户")
    return String(activeUser.id)
  }

  // 🟢 5. 初始化并加固数据库表结构
  useEffect(() => {
    try {
      // 确保表存在
      db.execSync(`
        CREATE TABLE IF NOT EXISTS ActivityLog (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT,
          type TEXT,
          address TEXT,
          latitude REAL,
          longitude REAL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      // 容错处理：如果之前 MainScreen 建表时没有 lat/lon 字段，这里静默补齐
      try { db.execSync("ALTER TABLE ActivityLog ADD COLUMN latitude REAL;"); } catch (e) {}
      try { db.execSync("ALTER TABLE ActivityLog ADD COLUMN longitude REAL;"); } catch (e) {}
    } catch (e) {
      console.log("轨迹表结构检查失败", e)
    }
  }, [])

  // 每次页面进入或聚焦时，重新同步本地数据并监听返回键
  useFocusEffect(
    useCallback(() => {
      fetchAllTrajectories()
      
      const onBackPress = () => {
        handleBack()
        return true
      }
      
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress)
      
      return () => subscription.remove()
    }, [])
  )

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack()
    } else {
      navigation.navigate("Settings") 
    }
  }

  /**
   * 获取并按天分类归纳轨迹
   */
  const fetchAllTrajectories = () => {
    setLoading(true)
    try {
      const userId = getActiveUserId()
      
      // 🟢 6. 从本地查出历史轨迹记录
      const results = db.getAllSync<{
        id: number, 
        address: string, 
        latitude: number, 
        longitude: number, 
        timestamp: string
      }>(
        "SELECT * FROM ActivityLog WHERE userId = ? AND type = 'trajectory' ORDER BY timestamp DESC LIMIT 1000",
        userId
      );

      const groups: { [key: string]: any[] } = {}
      
      results.forEach(log => {
        const latitude = Number(log.latitude)
        const longitude = Number(log.longitude)
        const hasValidCoordinates =
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= -90 &&
          latitude <= 90 &&
          longitude >= -180 &&
          longitude <= 180
        if (!hasValidCoordinates) return

        const dateObj = log.timestamp
        const date = new Date(dateObj)
        const dateStr = `${date.getFullYear()}年${(date.getMonth() + 1)}月${date.getDate()}日`
        
        if (!groups[dateStr]) groups[dateStr] = []
        
        groups[dateStr].push({
          id: log.id,
          location: log.address || "位置记录点",
          coords: {
            latitude,
            longitude,
          },
          time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        })
      })

      const finalData = Object.keys(groups).map(date => ({
        date,
        logs: groups[date]
      }))

      setGroupedData(finalData)
    } catch (error: any) {
      console.error("[Trajectory] 数据拉取失败:", error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 渲染单个日期的轨迹组合卡片 (UI 保持完全不变)
   */
  const renderDayItem = ({ item }: any) => {
    const latestLog = item.logs[0]
    const polylinePoints = [...item.logs].map((l: any) => l.coords).reverse()

    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {/* 卡片头部 */}
        <View style={styles.cardHeader}>
          <View style={[styles.dateLabel, { backgroundColor: colors.primary + '15' }]}>
            <Text text={item.date} style={[styles.dateLabelText, { color: colors.primary }]} />
          </View>
          <Text text={`${item.logs.length} 个点`} style={styles.metaText} />
        </View>

        {/* 地图预览 */}
        <View style={desktop && styles.dayColumns}>
        <View style={[styles.mapContainer, desktop && styles.wideMap]}>
          {Platform.OS === "web" ? (
            <AMapWebView center={latestLog.coords} zoom={14.5} markers={[latestLog.coords]} polyline={polylinePoints} gesturesEnabled={false} style={StyleSheet.absoluteFill} />
          ) : <MapView
            mapType={MapType.Standard}
            initialCameraPosition={{
              target: latestLog.coords,
              zoom: 14.5,
            }}
            style={StyleSheet.absoluteFill}
            scrollGesturesEnabled={false}
            zoomGesturesEnabled={false}
          >
            <Polyline points={polylinePoints} color={colors.primary} width={6} />
            <Marker position={latestLog.coords} />
          </MapView>}
          {/* 覆盖层防止滑动列表时干扰地图 */}
          <View style={StyleSheet.absoluteFill} />
        </View>

        {/* 轨迹时间轴 */}
        <View style={[styles.timelineArea, desktop && styles.timelineColumn]}>
          {item.logs.slice(0, 3).map((log: any, idx: number) => (
            <View key={log.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: idx === 0 ? colors.primary : colors.border }]} />
                {idx < Math.min(item.logs.length, 3) - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
              </View>
              <View style={styles.timelineRight}>
                <Text text={log.location} style={[styles.locationName, { color: colors.text }]} numberOfLines={1} />
                <Text text={log.time} style={styles.timestamp} />
              </View>
            </View>
          ))}
          {item.logs.length > 3 && (
            <Text text={`... 更多 ${item.logs.length - 3} 条动态`} style={styles.moreLabel} />
          )}
        </View>
        </View>
      </View>
    )
  }

  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.navButton}>
          <Icon icon="caretLeft" size={28} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.navTitleContainer}>
          <Text text="轨迹回顾" style={[styles.navTitle, { color: colors.text }]} 
          numberOfLines={1}
          adjustsFontSizeToFit/>
        </View>

        <View style={styles.navButton} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text text="同步足迹中..." style={styles.loadingInfo} />
        </View>
      ) : (
        <FlatList
          data={groupedData}
          keyExtractor={(item) => item.date}
          renderItem={renderDayItem}
          contentContainerStyle={[styles.scrollList, studentFrame]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyCircle, { backgroundColor: colors.border + '20' }]}>
                <Icon icon="view" size={64} color={colors.border} />
              </View>
              <Text text="尚未发现轨迹记录" style={[styles.emptyTitle, { color: colors.text }]} />
              <Text text="系统会在您移动时自动记录守护轨迹" style={styles.emptySub} />
            </View>
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  dayColumns: { flexDirection: "row", alignItems: "stretch", paddingBottom: 15 },
  wideMap: { flex: 1.55, height: 270 },
  timelineColumn: { flex: 1, minWidth: 0 },
  navBar: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
  },
  navTitleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navButton: { 
    width: 44, 
    height: 44, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  scrollList: { padding: 20, paddingBottom: 60 },
  
  card: {
    borderRadius: ui.radius.surface,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  dateLabel: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  dateLabelText: { fontSize: 13, fontWeight: 'bold' },
  metaText: { fontSize: 12, color: '#94A3B8' },

  mapContainer: {
    height: 160,
    backgroundColor: '#F1F5F9',
    marginHorizontal: 14,
    borderRadius: ui.radius.nested,
    overflow: 'hidden'
  },
  
  timelineArea: { padding: 20 },
  timelineItem: { flexDirection: 'row', height: 48 },
  timelineLeft: { alignItems: 'center', width: 24, marginRight: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, marginVertical: 2 },
  timelineRight: { flex: 1 },
  locationName: { fontSize: 15, fontWeight: '600' },
  timestamp: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  moreLabel: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 10 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingInfo: { marginTop: 16, color: '#94A3B8', fontSize: 14 },
  emptyWrap: { flex: 1, alignItems: 'center', marginTop: 120, paddingHorizontal: 40 },
  emptyCircle: { width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  emptySub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
})
