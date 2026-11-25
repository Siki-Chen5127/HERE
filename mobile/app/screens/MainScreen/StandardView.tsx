import { Alert } from "@/components/Feedback"
import React from "react"
import { Image, Platform, ScrollView, StyleSheet, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { MapView, MapType, Marker } from "react-native-amap3d"
import { AMapWebView } from "@/components/AMapWebView"
import { Text } from "@/components/Text"
import {HomeIcon as Icon,type IconTypes,} from "./components/HomeIcon"
import { isAMapConfigured } from "@/services/amap"
import { HomeHeader } from "./components/HomeHeader"
import { GlassSurface } from "./components/GlassSurface"
import { SoftPressable } from "./components/SoftPressable"
import { homeColors as C } from "./components/homeAppearance"
import { useAuth } from "@/context/AuthContext"
import { DailyMood } from "./components/DailyMood"
import { useViewport } from "@/utils/useViewport"
import { HomeActivity } from "./components/HomeActivity"
import { studentUi as ui } from "@/theme/studentUi"

interface StandardViewProps {
  user: any
  currentLocation: any
  locationName: string
  locationPending: boolean
  onRequestLocation: () => void
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
    locationPending,
    onRequestLocation,
    updateTime,
    navigation,
    onCheckIn,
    onSOS,
    onOpenMap,
    onNotificationPress,
  } = props
  const insets = useSafeAreaInsets()
  const { currentUser } = useAuth()
  const { fontScale, width } = useViewport()
  const desktop = Platform.OS === "web" && width >= 1100 && fontScale < 1.3
  const largeText = fontScale >= 1.3
  const [scrollEnabled, setScrollEnabled] = React.useState(true)
  const [moodRevision, setMoodRevision] = React.useState(0)
  const mapRef = React.useRef<any>(null)
  const mapConfigured = isAMapConfigured()
  const isWeb = Platform.OS === "web"
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
    navigation.navigate("Support", { section: "request" })
  const upcomingProgress = () =>
    navigation.navigate("Support", { section: "progress" })

  const shortcut = (title: string, icon: IconTypes, action: () => void) => (
    <SoftPressable
      style={styles.shortcut}
      onPress={action}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.shortcutContent}>
        <Icon icon={icon} size={23} color={C.text} />
        <View style={styles.shortcutText}>
          <Text text={title} style={styles.shortcutTitle} />
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
        contentContainerStyle={[styles.content, desktop && styles.desktopContent, { paddingTop: insets.top + (desktop ? 36 : 16) }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >
        <HomeHeader
          user={user}
          onNotificationPress={onNotificationPress}
          onProfilePress={() => navigation.navigate("ProfileEdit")}
        />

        <View style={desktop && styles.desktopSections}>
        <View style={desktop && styles.primarySection}>
        <SoftPressable
          testID="home-chat"
          onPress={() => navigation.navigate("AiChat")}
          accessibilityRole="button"
          accessibilityLabel="聊一聊，进入 AI 对话"
          style={styles.chatAction}
        >
          <Image
            source={require("../../../assets/images/home-ambient.png")}
            resizeMode="cover"
            style={styles.chatBackdrop}
            accessible={false}
          />
          <LinearGradient colors={["#f7efcd", "rgba(247,239,205,0.88)", "rgba(227,237,208,0.08)"]}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          <View style={[styles.chatContent, desktop && styles.desktopChatContent]}>
            <View style={styles.chatText}>
              <Text text="有什么想说的，" style={styles.chatTitle} />
              <Text text="慢慢说。" style={styles.chatTitle} />
              <Text text="和 HERE 聊聊今天发生的事。" style={styles.chatDescription} />
              <View style={styles.chatPill}>
                <Icon icon="write" size={18} color="#fffaf0" />
                <Text text="开始对话" style={styles.chatPillText} />
              </View>
            </View>
          </View>
        </SoftPressable>

        <DailyMood
          key={currentUser?.id ?? "signed-out"}
          userId={currentUser?.id ?? null}
          largeText={largeText}
          onRecorded={() => setMoodRevision(revision => revision + 1)}
        />

        <View style={[styles.shortcuts, largeText && styles.stack]}>
          {shortcut("联系辅导员", "contact", upcomingHelp)}
          {!largeText && <View style={styles.shortcutDivider} />}
          {shortcut("我的求助", "mood", upcomingProgress)}
        </View>
        <View style={[styles.shortcuts, styles.lastShortcut]}>
          {shortcut("近况与休息", "mood", () => navigation.navigate("Support", { section: "wellbeing" }))}
        </View>
        </View>

        <View style={desktop && styles.secondarySection}>
        {desktop && <View pointerEvents="none" style={styles.sectionRule} />}
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
                isWeb ? (
                  <AMapWebView
                    ref={mapRef}
                    center={currentLocation}
                    zoom={16}
                    markers={[currentLocation]}
                    style={styles.map}
                  />
                ) : (
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
                )
              ) : (
                <View style={styles.mapPlaceholder}>
                  <Icon icon="location" size={28} color={C.primary} />
                  <Text
                    text={!hasLocation ? locationName : "地图暂时不可用"}
                    style={styles.placeholderText}
                    accessibilityLiveRegion="polite"
                  />
                  {isWeb && !hasLocation && (
                    <SoftPressable
                      testID="home-request-location"
                      accessibilityRole="button"
                      disabled={locationPending}
                      onPress={onRequestLocation}
                      style={styles.locationAction}
                    >
                      <Text
                        text={locationPending ? "定位中…" : "获取当前位置"}
                        style={styles.locationActionText}
                      />
                    </SoftPressable>
                  )}
                </View>
              )}
            </View>
          </View>
          {(!isWeb || hasLocation) && <View style={styles.addressRow}>
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
          </View>}
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
          </View>
          <Text
            text="在「我的求助」查看辅导员回复和后续安排。"
            style={styles.followUpDescription}
          />
        </View>
        </View>
        </View>
        {desktop && <HomeActivity userId={currentUser?.id ?? null} revision={moodRevision} onProgress={upcomingProgress} />}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  backdrop: { width: "100%", height: "100%" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 22, paddingBottom: 32, width: "100%", maxWidth: 1180, alignSelf: "center" },
  desktopContent: { paddingHorizontal: 39, flexGrow: 1 },
  desktopSections: { flexDirection: "row", alignItems: "stretch", gap: 34 },
  primarySection: { flex: 1.45, minWidth: 0 },
  secondarySection: { flex: 1, minWidth: 0, paddingLeft: 24 },
  sectionRule: { position: "absolute", top: 1, bottom: -6, left: 0, width: 1, backgroundColor: ui.line },
  chatAction: { marginBottom: 20, overflow: "hidden", borderRadius: ui.radius.feature, backgroundColor: "#f7efcd" },
  chatBackdrop: { ...StyleSheet.absoluteFillObject, height: "100%", width: "100%" },
  chatContent: {
    paddingHorizontal: 23,
    paddingVertical: 25,
    minHeight: 223,
    justifyContent: "center",
  },
  desktopChatContent: { minHeight: 260, paddingHorizontal: 33 },
  chatText: { alignItems: "flex-start" },
  chatTitle: { fontSize: 31, lineHeight: 40, fontWeight: "700", color: "#2c4737" },
  chatDescription: { fontSize: 14, lineHeight: 22, color: "#415644", marginTop: 7 },
  chatPill: { backgroundColor: "#345b45", flexDirection: "row", gap: 7, alignItems: "center",
    minHeight: 44, paddingHorizontal: 15, borderRadius: 24, marginTop: 16 },
  chatPillText: { color: "#fffaf0", fontSize: 14, fontWeight: "600" },
  shortcuts: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderColor: ui.line },
  lastShortcut: { paddingTop: 12, paddingBottom: 3 },
  shortcut: { flex: 1, alignSelf: "stretch" },
  shortcutContent: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 68,
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  shortcutText: { flex: 1, marginLeft: 9, marginRight: 3 },
  shortcutTitle: { fontSize: 15, lineHeight: 23, fontWeight: "500", color: C.text },
  shortcutDivider: { width: 1, height: 36, backgroundColor: ui.line, marginHorizontal: 8, alignSelf: "center" },
  microText: { fontSize: 11, lineHeight: 18, color: C.secondary },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 20, lineHeight: 29, fontWeight: "600", color: C.text },
  mapFrame: { padding: 5 },
  mapClip: { overflow: "hidden", borderRadius: ui.radius.nested },
  mapArea: { height: 164, backgroundColor: "#E5EBDB" },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  placeholderText: {
    fontSize: 14, lineHeight: 22, color: C.secondary, marginTop: 8, textAlign: "center",
  },
  locationAction: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primary,
  },
  locationActionText: { fontSize: 14, fontWeight: "600", color: C.primary },
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
