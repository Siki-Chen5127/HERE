import React from "react"
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { MapView, MapType, Marker } from "react-native-amap3d"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { isAMapConfigured } from "@/services/amap"
import { useAppTheme } from "@/theme/context"
import { HomeHeader } from "./components/HomeHeader"

interface StandardViewProps {
  user: any
  currentLocation: any
  locationName: string
  updateTime: string
  navigation: any
  timeline: any[]
  onCheckIn: () => void
  onMoodBad: () => void
  onSOS: () => void
  onOpenMap: () => void
  onNotificationPress: () => void
}

export const StandardView = (props: StandardViewProps) => {
  const { theme: { colors } } = useAppTheme()
  const { 
    user, currentLocation, locationName, updateTime, timeline,
    onCheckIn, onMoodBad, onSOS, onOpenMap, onNotificationPress 
  } = props
  const [scrollEnabled, setScrollEnabled] = React.useState<boolean>(true)
  const mapRef = React.useRef<MapView>(null)
  
  // 1. 颜色兜底，防止主题色丢失
  const primaryColor = colors.primary || '#10B981'
  const mapConfigured = isAMapConfigured()
  const hasLocation = Number.isFinite(currentLocation?.latitude) && Number.isFinite(currentLocation?.longitude)

  const moveMapToCurrentLocation = React.useCallback(() => {
    const latitude = currentLocation?.latitude
    const longitude = currentLocation?.longitude

    if (!mapConfigured || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return

    mapRef.current?.moveCamera(
      {
        target: { latitude, longitude },
        zoom: 16,
      },
      500,
    )
  }, [currentLocation?.latitude, currentLocation?.longitude, mapConfigured])

  React.useEffect(() => {
    moveMapToCurrentLocation()
  }, [moveMapToCurrentLocation])

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      
      {/* 1. 头部组件 */}
      <HomeHeader user={user} onNotificationPress={onNotificationPress} />

      {/* 2. 滚动内容区 */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 110, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        {/* A. 地图主卡片 */}
        <View 
          style={[styles.mapCard, { backgroundColor: colors.surface }]}
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        > 
          {mapConfigured && hasLocation ? (
            <MapView
              ref={mapRef}
              mapType={MapType.Standard}
              initialCameraPosition={{ target: props.currentLocation, zoom: 16 }}
              onLoad={moveMapToCurrentLocation}
              style={{ flex: 1 }}
              scrollGesturesEnabled={true}
              zoomGesturesEnabled={true}
              zoomControlsEnabled={false}
            >
              <Marker position={currentLocation} />
            </MapView>
          ) : (
            <View style={styles.mapUnavailable}>
              <Icon icon="location" size={34} color={primaryColor} />
              <Text
                text={mapConfigured ? "正在获取当前位置" : "地图服务暂未配置"}
                style={styles.mapUnavailableTitle}
              />
              <Text
                text={mapConfigured ? "定位完成后地图会自动显示当前位置" : "请完成高德地图 Key 配置后重新启动应用"}
                style={styles.mapUnavailableHint}
              />
            </View>
          )}
          
          <View style={styles.floatAddressBar}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0F9F6' }]}>
              <Icon icon="view" size={22} color={primaryColor} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text text={locationName} numberOfLines={1} style={{ fontWeight: 'bold', fontSize: 15, color: '#333' }} />
              <Text text={`更新于 ${updateTime}`} style={{ fontSize: 11, color: '#999', marginTop: 2 }} />
            </View>
            <TouchableOpacity style={[styles.navBtnSmall, {backgroundColor: primaryColor + '15'}]} onPress={onOpenMap}>
              <Text text="导航" style={{ fontSize: 12, color: primaryColor, fontWeight: 'bold' }} />
            </TouchableOpacity>
          </View>
        </View>

       {/* SOS 紧急求助 */}
        <TouchableOpacity style={[styles.sosButton, { backgroundColor: colors.error, shadowColor: colors.error }]} onPress={onSOS}>
          <Icon icon="sos" size={26} color={null} style={{ marginRight: 10 }} />
          <Text text="紧急求助" style={{ fontSize: 20, fontWeight: 'bold', color: 'white' }} />
        </TouchableOpacity>

        {/* B. 功能按钮区 */}
        {/*报平安*/}
        <TouchableOpacity style={styles.actionCard} onPress={onCheckIn}>
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Icon icon="check" size={28} color={null} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text text="一键报平安" style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }} />
            <Text text="同步位置给家人" style={{ fontSize: 12, color: '#999', marginTop: 2 }} />
          </View>
          <Icon icon="caretRight" size={16} color={null} />
        </TouchableOpacity>

        {/*状态不佳*/}
        <TouchableOpacity style={styles.actionCard} onPress={onMoodBad}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Icon icon="view" size={28} color={null} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text text="我今天状态不佳" style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }} />
            <Text text="和朋友聊聊吧" style={{ fontSize: 12, color: '#999', marginTop: 2 }} />
          </View>
          <Icon icon="caretRight" size={16} color={null} />
        </TouchableOpacity>

        {/*电子围栏设置*/}
        <TouchableOpacity 
          style={styles.actionCard} 
          onPress={() => props.navigation.navigate("Geofence", { elderId: props.user?.id, elderName: props.user?.displayName })}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>            
            <Icon icon="radar" size={28} color={null} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text text="电子围栏设置" style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }} />
            <Text text="设定安全区域，离开即报警" style={{ fontSize: 12, color: '#999', marginTop: 2 }} />
          </View>
          <Icon icon="caretRight" size={16} color={null} />
        </TouchableOpacity>

        {/* 轨迹预览 */}
        <View style={styles.timelineContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text text="行动轨迹" style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}
            numberOfLines={1} 
            adjustsFontSizeToFit />
            </View>
          
          <View style={{ paddingLeft: 6 }}>
            <View style={{ position: 'absolute', left: 11, top: 6, bottom: 20, width: 2, backgroundColor: '#eee' }} />
            {timeline.map((item, index) => (
              <View key={item.id} style={{ flexDirection: 'row', marginBottom: 20 }}>
                <View style={[styles.timelineDot, { backgroundColor: index === 0 ? primaryColor : '#ddd' }]} />
                <View style={{ marginLeft: 16 }}>
                  <Text text={`${item.status === 'arrived' ? '到达' : '离开'} ${item.location}`} style={{ fontSize: 14, fontWeight: index === 0 ? 'bold' : 'normal', color: '#333' }} />
                  <Text text={item.time} style={{ fontSize: 12, color: '#999', marginTop: 2 }} />
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  mapCard: {
    height: 380, // 稍微加高一点，视野更好
    borderRadius: 24, 
    overflow: 'hidden', 
    marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, elevation: 5,
    borderWidth: 1, borderColor: 'white',
    backgroundColor: 'white'
  },
  mapUnavailable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
    backgroundColor: '#F3F4F6',
  },
  mapUnavailableTitle: { marginTop: 12, color: '#374151', fontSize: 16, fontWeight: 'bold' },
  mapUnavailableHint: { marginTop: 6, color: '#6B7280', fontSize: 12, textAlign: 'center' },
  floatAddressBar: {
    position: 'absolute', bottom: 12, left: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 8,
    flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.05, elevation: 2,
  },
  iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  navBtnSmall: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  actionCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2,
  },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sosButton: {
    height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    marginBottom: 24, elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3,
  },
  timelineContainer: { backgroundColor: 'white', borderRadius: 24, padding: 20, marginBottom: 40 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: 'white', zIndex: 1 },
})
