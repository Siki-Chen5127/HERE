import React from "react"
import { Alert, Image, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MapView, MapType, Marker } from "react-native-amap3d"
import { Text } from "@/components/Text"
import {HomeIcon as Icon,type IconTypes,} from "./components/HomeIcon"
import { isAMapConfigured } from "@/services/amap"
import { HomeHeader } from "./components/HomeHeader"
import { GlassSurface } from "./components/GlassSurface"
import { SoftPressable } from "./components/SoftPressable"
import { homeColors as C } from "./components/homeAppearance"
import { useAuth } from "@/context/AuthContext"
import { DailyMood } from "./components/DailyMood"

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
  const {
    user,
    currentLocation,
    locationName,
    updateTime,
    navigation,
    onCheckIn,
    onSOS,
    onOpenMap,
    onNotificationPress,
  } = props
  const insets = useSafeAreaInsets()
  const { currentUser } = useAuth()
  const { fontScale } = useWindowDimensions()
  const largeText = fontScale >= 1.3
  const [scrollEnabled, setScrollEnabled] = React.useState(true)
  const mapRef = React.useRef<MapView>(null)
  const mapConfigured = isAMapConfigured()
  const hasLocation =
    Number.isFinite(currentLocation?.latitude) && Number.isFinite(currentLocation?.longitude)

  const moveMapToCurrentLocation = React.useCallback(() => {
    const latitude = currentLocation?.latitude
    const longitude = currentLocation?.longitude
    if (!mapConfigured || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    mapRef.current?.moveCamera({ target: { latitude, longitude }, zoom: 16 }, 500)
  }, [currentLocation?.latitude, currentLocation?.longitude, mapConfigured])

  React.useEffect(() => {
    moveMapToCurrentLocation()
  }, [moveMapToCurrentLocation])

  const confirmCheckIn = () =>
    Alert.alert(
      "报平安",
      "将打开短信应用，短信草稿包含当前位置。请检查收件人和内容，再由你确认发送。",
      [
        { text: "取消", style: "cancel" },
        { text: "继续", onPress: onCheckIn },
      ],
    )
  const upcomingHelp = () =>
    Alert.alert("校园帮助", "校园支持服务尚未开放。开放后，你可以在这里查找联系渠道和服务时间。")
  const upcomingProgress = () =>
    Alert.alert("我的求助", "求助服务尚未开放。开放后，你可以在这里查看处理进度、回复和后续安排。")

  const shortcut = (title: string, icon: IconTypes, action: () => void) => (
    <SoftPressable
      style={styles.shortcut}
      onPress={action}
      accessibilityRole="button"
      accessibilityLabel={`${title}，待开放`}
    >
      <View style={styles.shortcutContent}>
        <Icon icon={icon} size={23} color={C.text} />
        <View style={styles.shortcutText}>
          <Text text={title} style={styles.shortcutTitle} />
          <Text text="待开放" style={styles.microText} />
        </View>
        <Icon icon="caretRight" size={15} color={C.secondary} />
      </View>
    </SoftPressable>
  )

  return (
    <View style={styles.container}>
      <View
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={require("../../../assets/images/home-ambient.png")}
          resizeMode="cover"
          style={styles.backdrop}
        />
        <LinearGradient
          colors={["rgba(247,247,230,0.05)", "rgba(242,244,232,0.35)", "rgba(237,242,230,0.82)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <ScrollView
        testID="home-scroll"
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <HomeHeader
          user={user}
          onNotificationPress={onNotificationPress}
          onProfilePress={() => navigation.navigate("ProfileEdit")}
        />

        <DailyMood
          key={currentUser?.id ?? "signed-out"}
          userId={currentUser?.id ?? null}
          largeText={largeText}
        />

        <SoftPressable
          testID="home-chat"
          onPress={() => navigation.navigate("AiChat")}
          accessibilityRole="button"
          accessibilityLabel="聊一聊，进入 AI 对话"
          style={styles.chatAction}
        >
          <GlassSurface green contentStyle={styles.chatContent}>
            <View style={styles.chatIcon}>
              <Icon icon="write" size={29} color="#F5F8EB" />
            </View>
            <View style={styles.chatText}>
              <Text text="聊一聊" style={styles.chatTitle} />
              <Text text="有什么想说的，慢慢说。" style={styles.chatDescription} />
            </View>
            <Icon icon="caretRight" size={22} color="#EDF3E5" />
          </GlassSurface>
        </SoftPressable>

        <View style={[styles.shortcuts, largeText && styles.stack]}>
          {shortcut("校园帮助", "contact", upcomingHelp)}
          {!largeText && <View style={styles.shortcutDivider} />}
          {shortcut("我的求助", "mood", upcomingProgress)}
        </View>

        <View style={styles.sectionHeading}>
          <Text text="附近" style={styles.sectionTitle} />
          <Text text="当前位置" style={styles.microText} />
        </View>
        <GlassSurface contentStyle={styles.mapFrame}>
          <View style={styles.mapClip}>
            <View
              style={styles.mapArea}
              onTouchStart={() => setScrollEnabled(false)}
              onTouchEnd={() => setScrollEnabled(true)}
              onTouchCancel={() => setScrollEnabled(true)}
            >
              {mapConfigured && hasLocation ? (
                <MapView
                  ref={mapRef}
                  mapType={MapType.Standard}
                  initialCameraPosition={{ target: currentLocation, zoom: 16 }}
                  onLoad={moveMapToCurrentLocation}
                  style={styles.map}
                  scrollGesturesEnabled
                  zoomGesturesEnabled
                  zoomControlsEnabled={false}
                >
                  <Marker position={currentLocation} />
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Icon icon="location" size={28} color={C.primary} />
                  <Text
                    text={mapConfigured ? "正在获取当前位置" : "地图暂时不可用"}
                    style={styles.placeholderText}
                  />
                </View>
              )}
            </View>
          </View>
          <View style={styles.addressRow}>
            <Icon icon="location" size={20} color={C.text} />
            <View style={styles.addressContent}>
              <Text
                text={locationName || "暂未获取位置"}
                style={styles.addressText}
                numberOfLines={2}
              />
              {hasLocation && <Text text={`位置更新于 ${updateTime}`} style={styles.microText} />}
            </View>
            <SoftPressable
              testID="home-open-map"
              onPress={onOpenMap}
              disabled={!hasLocation}
              accessibilityRole="button"
              accessibilityLabel="打开当前位置地图"
              accessibilityState={{ disabled: !hasLocation }}
            >
              <View style={styles.mapButton}>
                <Icon icon="navigation" size={22} color={hasLocation ? C.primary : C.secondary} />
              </View>
            </SoftPressable>
          </View>
        </GlassSurface>

        <View style={[styles.utilityRow, largeText && styles.stack]}>
          <SoftPressable
            testID="home-check-in"
            style={styles.utility}
            onPress={confirmCheckIn}
            accessibilityRole="button"
            accessibilityLabel="报平安，确认后打开短信草稿"
          >
            <View style={styles.utilityContent}>
              <Icon icon="check" size={23} color={C.primary} />
              <Text text="报平安" style={styles.utilityTitle} />
            </View>
          </SoftPressable>
          {!largeText && <View style={styles.shortcutDivider} />}
          <SoftPressable
            testID="home-sos"
            style={styles.utility}
            onPress={onSOS}
            accessibilityRole="button"
            accessibilityLabel="紧急求助"
          >
            <View style={styles.utilityContent}>
              <Icon icon="alert" size={23} color={C.danger} />
              <Text text="紧急求助" style={[styles.utilityTitle, styles.dangerText]} />
            </View>
          </SoftPressable>
        </View>
        <View style={styles.followUp}>
          <View style={styles.followUpHeading}>
            <Text text="后续安排" style={styles.followUpTitle} />
            <Text text="待开放" style={styles.microText} />
          </View>
          <Text
            text="求助服务开放后，这里会显示回复与跟进安排。"
            style={styles.followUpDescription}
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  backdrop: { width: "100%", height: "100%" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 32 },
  chatAction: { marginBottom: 13 },
  chatContent: {
    paddingHorizontal: 19,
    paddingVertical: 25,
    flexDirection: "row",
    alignItems: "center",
  },
  chatIcon: {
    paddingRight: 15,
    marginRight: 15,
    borderRightWidth: 1,
    borderRightColor: "rgba(245,248,235,0.3)",
  },
  chatText: { flex: 1, marginRight: 8 },
  chatTitle: { fontSize: 25, lineHeight: 35, fontWeight: "600", color: "#FAFBF2", marginBottom: 4 },
  chatDescription: { fontSize: 13, lineHeight: 21, color: "#E8F0E2" },
  shortcuts: { flexDirection: "row", alignItems: "center", marginBottom: 19 },
  shortcut: { flex: 1, alignSelf: "stretch" },
  shortcutContent: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  shortcutText: { flex: 1, marginLeft: 9, marginRight: 3 },
  shortcutTitle: { fontSize: 15, lineHeight: 23, fontWeight: "500", color: C.text },
  shortcutDivider: { width: 1, height: 25, backgroundColor: C.line, marginHorizontal: 5 },
  microText: { fontSize: 11, lineHeight: 18, color: C.secondary },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, lineHeight: 29, fontWeight: "600", color: C.text },
  mapFrame: { padding: 5 },
  mapClip: { overflow: "hidden", borderRadius: 19 },
  mapArea: { height: 202, backgroundColor: "#E5EBDB" },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  placeholderText: { fontSize: 14, lineHeight: 22, color: C.secondary, marginTop: 8 },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingVertical: 9,
    paddingRight: 3,
  },
  addressContent: { flex: 1, marginLeft: 9, marginRight: 5 },
  addressText: { fontSize: 13, lineHeight: 21, fontWeight: "500", color: C.text },
  mapButton: { width: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  utilityRow: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 14 },
  utility: { flex: 1, alignSelf: "stretch" },
  utilityContent: {
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  utilityTitle: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: "500",
    color: C.primary,
    flexShrink: 1,
  },
  dangerText: { color: C.danger },
  followUp: { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 15, paddingHorizontal: 3 },
  followUpHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  followUpTitle: { fontSize: 14, lineHeight: 22, fontWeight: "500", color: C.text },
  followUpDescription: { fontSize: 12, lineHeight: 20, color: C.secondary },
  stack: { flexDirection: "column", alignItems: "stretch" },
})
