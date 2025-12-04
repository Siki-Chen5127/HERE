import React, { FC, useState, useEffect, useCallback } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ViewStyle,
  TextStyle,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { MapView, MapType, Marker, Polyline } from "react-native-amap3d"
import AV from "leancloud-storage/core"
import { useFocusEffect } from "@react-navigation/native"

const SCREEN_WIDTH = Dimensions.get('window').width

const COLORS = {
  primary: '#10B981', 
  bg: '#F9FAFB',      
  white: '#FFFFFF',
  textMain: '#1F2937', 
  textSub: '#9CA3AF', 
  border: '#E5E7EB',
  overlay: 'rgba(0,0,0,0.5)',
}

export const TrajectoryScreen: FC<any> = ({ navigation }) => {
  const [loading, setLoading] = useState(true)
  const [dataList, setDataList] = useState<any[]>([]) 

  useFocusEffect(
    useCallback(() => {
      fetchTodaysTrajectory()
    }, [])
  )

  const fetchTodaysTrajectory = async () => {
    setLoading(true)
    try {
      const currentUser = await AV.User.currentAsync()
      
      // 查询 ActivityLog 表
      const query = new AV.Query('ActivityLog')
      query.equalTo('user', currentUser)
      
      const todayStart = new Date()
      todayStart.setHours(0,0,0,0)
      query.greaterThanOrEqualTo('createdAt', todayStart)
      query.ascending('createdAt')
      query.limit(1000) 

      const results = await query.find()
      
      if (results.length > 0) {
        const coords = results.map(p => {
          const loc = p.get('location')
          return { latitude: loc.latitude, longitude: loc.longitude }
        })

        // 1. 修复时间报错：安全获取 createdAt
        const firstTime = results[0].createdAt
        const startHour = firstTime ? firstTime.getHours() : 0
        const startMin = firstTime ? firstTime.getMinutes().toString().padStart(2, '0') : '00'

        const timeRangeStr = results.length > 1 
          ? `${startHour}:${startMin} - 现在`
          : `${startHour}:${startMin}`

        setDataList([{
          title: '今天',
          data: [{
            id: 'today-track',
            title: '今日实时轨迹',
            duration: '记录中...',
            timeRange: timeRangeStr,
            location: '当前位置',
            coordinates: coords
          }]
        }])
      } else {
        setDataList([])
      }

    } catch (error: any) {
      if (error.code === 101 || (error.message && error.message.includes("Class or object doesn't exists"))) {
        console.log("云端尚未创建 ActivityLog 表，视为无记录")
        setDataList([])
      } else {
        console.error("轨迹获取失败", error)
      }
    } finally {
      setLoading(false)
    }
  }
  
  const renderItem = ({ item }: any) => {
    if (!item.coordinates || item.coordinates.length === 0) return null

    // 判断是否只有一个点
    const isSinglePoint = item.coordinates.length === 1;

    return (
      <View style={$styles.card}>
        <View style={$styles.mapContainer}>
          <MapView
            mapType={MapType.Standard}
            initialCameraPosition={{
              target: item.coordinates[item.coordinates.length - 1], // 聚焦最新位置
              zoom: 16,
            }}
            style={$styles.mapView}
            // 2. 修复报错：移除了 scrollEnabled={false} 等可能引起报错的属性
            // 如果需要禁用手势，尝试使用 uiSettings (视版本而定)，这里先移除以保运行
          >
            {/* 起点/当前点 Marker */}
            <Marker 
              position={item.coordinates[0]} 
              icon={undefined}
            />
            
            {/* 只有当点数大于1时，才绘制终点和连线 */}
            {!isSinglePoint && (
              <>
                <Marker 
                  position={item.coordinates[item.coordinates.length - 1]} 
                  icon={undefined} 
                />
                <Polyline 
                  points={item.coordinates} 
                  color={COLORS.primary} 
                  width={6} 
                />
              </>
            )}
          </MapView>
          
          <View style={$styles.mapOverlay} pointerEvents="none" />

          <View style={$styles.timeTag}>
            <Text style={$styles.timeTagText} text={item.timeRange} />
          </View>
        </View>

        <View style={$styles.cardInfo}>
          <View style={$styles.infoRow}>
            <Text style={$styles.cardTitle} text={item.title} />
            <Text style={$styles.durationText} text={item.duration} />
          </View>
          <View style={$styles.locationRow}>
            <Text style={{ fontSize: 14, color: COLORS.textSub, marginRight: 4 }}>📍</Text>
            <Text style={$styles.locationText} text={item.location} />
          </View>
        </View>
      </View>
    )
  }

  const renderSectionHeader = ({ section: { title, data } }: any) => {
    return (
      <View>
        <View style={$styles.dateHeader}>
          <View style={$styles.line} />
          <Text style={$styles.dateText} text={title} />
          <View style={$styles.line} />
        </View>
        {data.length === 0 && (
          <View style={$styles.emptyState}>
            <Text style={$styles.emptyText} text="暂无轨迹记录，请带着手机走走吧~" />
          </View>
        )}
      </View>
    )
  }
  
  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      backgroundColor={COLORS.bg}
      // 3. 修复报错：移除了 statusBarStyle 属性
    >
      <View style={$styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={$styles.headerTitle} text="历史轨迹" />
        <TouchableOpacity style={{ padding: 8 }}>
          <Text style={{ fontSize: 20 }}>📅</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.textSub }}>正在同步云端轨迹...</Text>
        </View>
      ) : (
        <FlatList
          data={dataList}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => (
            <View>
              {renderSectionHeader({ section: item })}
              {item.data.map((subItem: any) => (
                <View key={subItem.id}>
                  {renderItem({ item: subItem })}
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={$styles.content}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={$styles.emptyState}>
              <Text style={$styles.emptyText} text="今天还没有出门哦" />
            </View>
          }
        />
      )}
    </Screen>
  )
}

const $styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  } as ViewStyle,
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,

  content: {
    padding: 24,
    paddingBottom: 40,
  } as ViewStyle,

  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  } as ViewStyle,
  line: { flex: 1, height: 1, backgroundColor: '#D1D5DB' } as ViewStyle,
  dateText: { fontSize: 12, color: COLORS.textSub } as TextStyle,

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,

  mapContainer: {
    height: 150, 
    backgroundColor: '#E5E7EB',
    position: 'relative',
  } as ViewStyle,
  mapView: { flex: 1 } as ViewStyle,
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  } as ViewStyle,
  
  timeTag: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  } as ViewStyle,
  timeTagText: { color: COLORS.white, fontSize: 10 } as TextStyle,

  cardInfo: { padding: 16 } as ViewStyle,
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  } as ViewStyle,
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  durationText: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary } as TextStyle,
  
  locationRow: { flexDirection: 'row', alignItems: 'center' } as ViewStyle,
  locationText: { fontSize: 12, color: COLORS.textSub } as TextStyle,

  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  } as ViewStyle,
  emptyText: { color: COLORS.textSub, fontSize: 14 } as TextStyle,
})