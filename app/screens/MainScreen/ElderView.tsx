import React from "react"
import { View, TouchableOpacity, StyleSheet, Dimensions, PixelRatio } from "react-native"
import { MapView, MapType, Marker, Circle } from "react-native-amap3d"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { useAppTheme } from "@/theme/context"
import { colors as themeColors } from "@/theme/colors"

// 适配工具：限制最大字体缩放倍数，防止老人机调到“特大”时布局崩坏
const fontScale = PixelRatio.getFontScale()
const maxScale = fontScale > 1.5 ? 1.5 : fontScale

interface ElderViewProps {
  user: any
  currentLocation: any
  locationName: string
  fenceData?: any 
  navigation: any 
  onCheckIn: () => void
  onSOS: () => void
}

export const ElderView = (props: ElderViewProps) => {
  const { user, currentLocation, locationName, fenceData, onCheckIn, onSOS } = props
  const ec = themeColors.palette.elder // 使用长辈专属色板

  return (
    <View style={[styles.container, { backgroundColor: ec.bg }]}>
      
      {/* 1. 顶部状态栏区域 */}
      <View style={styles.header}>
        <View>
          <Text text="你好，" style={{ fontSize: 20, color: ec.textSub }} />
          <Text 
            text={user?.displayName || "长辈"} 
            style={{ fontSize: 36, fontWeight: '900', color: ec.textMain, lineHeight: 44 }} 
            numberOfLines={1}
            adjustsFontSizeToFit
          />
        </View>
        <View style={[styles.statusTag, { borderColor: ec.success }]}>
          <Icon icon="check" size={20} color={null} />
          <Text text="运行正常" style={{ fontSize: 16, fontWeight: 'bold', color: ec.success, marginLeft: 4 }} />
        </View>
      </View>

      {/* 2. 位置卡片 (Flex 布局，自适应高度) */}
      <View style={[styles.card, { flex: 4, borderColor: ec.primary }]}>
        {/* 地图区域 */}
        <View style={styles.mapContainer}>
          <MapView
            mapType={MapType.Standard}
            initialCameraPosition={{ target: currentLocation, zoom: 15 }}
            style={{ flex: 1 }}
            scrollGesturesEnabled={false} 
            zoomGesturesEnabled={false}
            zoomControlsEnabled={false}
            scaleControlsEnabled={false}
          >
            <Marker position={currentLocation} />
            {fenceData && (
              <Circle
                center={fenceData.center}
                radius={fenceData.radius}
                strokeWidth={3}
                strokeColor={ec.success}
                fillColor="rgba(0, 128, 0, 0.1)"
              />
            )}
          </MapView>
        </View>
        
        {/* 地址文字 */}
        <View style={styles.addressBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Icon icon="view" size={24} color={null} />
            <Text text="我现在的位置：" style={{ fontSize: 18, color: ec.textSub, fontWeight: 'bold' }} />
          </View>
          <Text 
            text={locationName} 
            style={{ fontSize: 22, fontWeight: 'bold', color: ec.textMain, lineHeight: 30 }} 
          />
        </View>
      </View>

      {/* 3. 底部超大按钮 (Flex 布局，确保可点击面积最大化) */}
      <View style={{ flex: 3, flexDirection: 'row', gap: 16, marginTop: 16, marginBottom: 16 }}>
        {/* 报平安 */}
        <TouchableOpacity 
          style={[styles.bigBtn, { backgroundColor: '#FFFFFF', borderColor: ec.primary }]} 
          onPress={onCheckIn}
          activeOpacity={0.6}
        >
          <Icon icon="check" size={60} color={null} />
          <Text text="报平安" 
          style={{ fontSize: 24, fontWeight: '900', color: ec.primary, marginTop: 12 }}
          numberOfLines={1}
          adjustsFontSizeToFit />
        </TouchableOpacity>

        {/* 紧急呼救 */}
        <TouchableOpacity 
          style={[styles.bigBtn, { backgroundColor: '#FEF2F2', borderColor: ec.alert }]} 
          onPress={onSOS}
          activeOpacity={0.6}
        >
          <Icon icon="bell" size={60} color={null} />
          <Text text="紧急呼救" 
          style={{ fontSize: 24, fontWeight: '900', color: ec.alert, marginTop: 12 }}
          numberOfLines={1}
          adjustsFontSizeToFit />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    minHeight: 60,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  mapContainer: {
    flex: 1, // 让地图占据卡片剩余空间
    minHeight: 120,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  addressBox: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  bigBtn: {
    flex: 1,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4, // 加粗边框，视觉更清晰
    elevation: 3,
  },
})