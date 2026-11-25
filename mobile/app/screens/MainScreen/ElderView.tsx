import React from "react"
import { Platform, View, TouchableOpacity, StyleSheet, PixelRatio } from "react-native"
import { MapView, MapType, Marker, Circle } from "react-native-amap3d"
import { AMapWebView } from "@/components/AMapWebView"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"
import { colors as themeColors } from "@/theme/colors"

// 适配工具：限制最大字体缩放倍数，防止老人机调到“特大”时布局崩坏
const fontScale = PixelRatio.getFontScale()
const maxScale = fontScale > 1.5 ? 1.5 : fontScale

interface ElderViewProps {
  user: any
  currentLocation: any
  locationName: string
  locationPending: boolean
  onRequestLocation: () => void
  fenceData?: any
  navigation: any
  onCheckIn: () => void
  onSOS: () => void
}

export const ElderView = (props: ElderViewProps) => {
  const { user, currentLocation, locationName, locationPending, onRequestLocation, fenceData, onCheckIn, onSOS } = props
  const ec = themeColors.palette.elder

  return (
    <View style={[styles.container, { backgroundColor: ec.bg }]}>
      <View style={styles.header}>
        <View>
          <Text text="你好，" style={{ fontSize: 20, color: ec.textSub }} />
          <Text
            text={user?.displayName || "长辈"}
            style={{ fontSize: 36, fontWeight: "900", color: ec.textMain, lineHeight: 44, maxFontSizeMultiplier: maxScale } as any}
            numberOfLines={1}
            adjustsFontSizeToFit
          />
        </View>
        <View style={[styles.statusTag, { borderColor: ec.success }]}>
          <Icon icon="check" size={20} color={null} />
          <Text text="运行正常" style={{ fontSize: 16, fontWeight: "bold", color: ec.success, marginLeft: 4 }} />
        </View>
      </View>

      <View style={[styles.card, { flex: 4, borderColor: ec.primary }]}>
        <View style={styles.mapContainer}>
          {Platform.OS === "web" && !currentLocation ? (
            <View style={styles.locationPlaceholder}>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={locationPending}
                onPress={onRequestLocation}
                style={styles.locationAction}
              >
                <Text text={locationPending ? "定位中…" : "获取当前位置"} />
              </TouchableOpacity>
            </View>
          ) : Platform.OS === "web" ? (
            <AMapWebView
              center={currentLocation}
              zoom={15}
              markers={[currentLocation]}
              circles={fenceData ? [{ center: fenceData.center, radius: fenceData.radius, strokeColor: ec.success, fillColor: "#008000" }] : []}
              gesturesEnabled={false}
              style={{ flex: 1 }}
            />
          ) : (
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
          )}
        </View>

        <View style={styles.addressBox}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Icon icon="view" size={24} color={null} />
            <Text text="我现在的位置：" style={{ fontSize: 18, color: ec.textSub, fontWeight: "bold" }} />
          </View>
          <Text
            text={locationName}
            accessibilityLiveRegion="polite"
            style={{ fontSize: 22, fontWeight: "bold", color: ec.textMain, lineHeight: 30 }}
          />
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: "#FFFFFF", borderColor: ec.primary }]}
          onPress={onCheckIn}
          activeOpacity={0.6}
        >
          <Icon icon="check" size={60} color={null} />
          <Text text="报平安" style={{ fontSize: 24, fontWeight: "900", color: ec.primary, marginTop: 12 }} numberOfLines={1} adjustsFontSizeToFit />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: "#FEF2F2", borderColor: ec.alert }]}
          onPress={onSOS}
          activeOpacity={0.6}
        >
          <Icon icon="bell" size={60} color={null} />
          <Text text="紧急呼救" style={{ fontSize: 24, fontWeight: "900", color: ec.alert, marginTop: 12 }} numberOfLines={1} adjustsFontSizeToFit />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20, minHeight: 60 },
  statusTag: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  card: { borderWidth: 2, borderRadius: 24, padding: 14, backgroundColor: "#FFFFFF", marginBottom: 16 },
  mapContainer: { height: 250, borderRadius: 18, overflow: "hidden", backgroundColor: "#E5E7EB" },
  locationPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  locationAction: {
    minHeight: 44, justifyContent: "center", paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  addressBox: { paddingHorizontal: 8, paddingTop: 16, paddingBottom: 8 },
  actionRow: { flex: 3, flexDirection: "row", gap: 16, marginTop: 16, marginBottom: 16 },
  bigBtn: { flex: 1, borderWidth: 2, borderRadius: 24, justifyContent: "center", alignItems: "center", padding: 12 },
})
