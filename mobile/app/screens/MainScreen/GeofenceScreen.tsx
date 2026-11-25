import { Alert, feedback } from "@/components/Feedback"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"
import React, { useState, useEffect } from "react"
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator, 
  Platform,
  StatusBar
} from "react-native"
import Slider from "@react-native-community/slider"
import { MapView, Circle, Marker } from "react-native-amap3d"
import { AMapWebView } from "@/components/AMapWebView"


// 2. 引入本地 SQLite
import * as SQLite from 'expo-sqlite'

import { useNavigationState, CommonActions } from "@react-navigation/native"
import { Screen } from "../../components/Screen"
import { Text } from "../../components/Text"
import { Icon } from "../../components/Icon" 
import { useAppTheme } from "../../theme/context"
import { getCurrentPosition } from "../../services/LocationRecorder"

const { width } = Dimensions.get("window")

const THEME = {
  primary: '#10B981',
  surface: '#FFFFFF',
  textMain: '#2C3333',
  textSub: '#829090',
  border: '#F0E6D2',
  shadow: 'rgba(149, 157, 165, 0.2)',
  bg: '#FFFBF5',
  mapBg: '#E5E7EB',
}

//  3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

export const GeofenceScreen = ({ navigation, route }: any) => {
  const { width, fontScale } = useViewport()
  const desktop = Platform.OS === "web" && width >= 970 && fontScale < 1.3
  const { elderId, elderName } = route.params || {}

  const routesLength = useNavigationState(state => state.routes.length)
  const canGoBackSafe = routesLength > 1

  const [center, setCenter] = useState<{ latitude: number; longitude: number } | null>(null)
  const [radius, setRadius] = useState(500)
  const [saving, setSaving] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)

  //  4. 初始化：如果表不存在就创建，然后拉取数据
  useEffect(() => {
    try {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS geofences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          elderId TEXT UNIQUE NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          radius REAL NOT NULL,
          isActive INTEGER DEFAULT 1
        );
      `);
    } catch (e) {
      console.log("围栏表检查失败", e);
    }
    
    void fetchCurrentFence()
  }, [])

  const fetchCurrentFence = async () => {
    setLoadingInitial(true)
    try {
      //  5. 从本地数据库查询围栏
      const fence = elderId
        ? db.getFirstSync<{latitude: number, longitude: number, radius: number}>(
            'SELECT * FROM geofences WHERE elderId = ?', String(elderId)
          )
        : null
      
      if (fence) {
        setCenter({ latitude: fence.latitude, longitude: fence.longitude })
        setRadius(fence.radius || 500)
      } else {
        setCenter(await getCurrentPosition())
      }
    } catch (e) {
      console.error("获取围栏失败", e)
      setCenter(null)
    } finally {
      setLoadingInitial(false)
    }
  }

  const handleSave = () => {
    if (!elderId) {
      Alert.alert("提示", "当前为预览模式，无法保存 (未传入长辈ID)")
      return
    }
    if (!center) {
      Alert.alert("尚未获取位置", "请开启定位权限后重试，不能使用未知位置创建围栏。")
      return
    }
    setSaving(true)
    try {
      // 6. 检查本地是否已有该老人的围栏
      const existing = db.getFirstSync<{id: number}>('SELECT id FROM geofences WHERE elderId = ?', String(elderId));
      
      if (existing) {
        // 更新现有数据
        db.runSync(
          'UPDATE geofences SET latitude = ?, longitude = ?, radius = ?, isActive = 1 WHERE elderId = ?',
          center.latitude, center.longitude, radius, String(elderId)
        );
      } else {
        // 插入新数据
        db.runSync(
          'INSERT INTO geofences (elderId, latitude, longitude, radius, isActive) VALUES (?, ?, ?, ?, 1)',
          String(elderId), center.latitude, center.longitude, radius
        );
      }
      
      feedback.success("设置成功", "电子围栏已更新到本地设备。")
      handleBack()
    } catch (e: any) {
      Alert.alert("保存失败", e.message || "本地数据库存储失败")
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    navigation.goBack() 
  }

  // --- UI 部分保持原汁原味，一行没动 ---
  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']} 
      style={{ flex: 1 }} 
      contentContainerStyle={[{ flex: 1 }, desktop && styles.desktopLayout]}
      backgroundColor={ui.canvas}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      <View style={[styles.mapContainer, desktop && styles.desktopMap]}>
        {loadingInitial ? (
          <View style={styles.loadingCenter}>
             <ActivityIndicator size="large" color={THEME.primary} />
             <Text text="正在获取当前位置..." style={{marginTop: 10, color: THEME.textSub}} />
          </View>
        ) : center ? (
          Platform.OS === "web" ? (
            <AMapWebView center={center} zoom={14.5} markers={[center]} circles={[{ center, radius, strokeColor: THEME.primary, fillColor: THEME.primary }]} onPress={setCenter} style={StyleSheet.absoluteFill} />
          ) : <MapView
            style={StyleSheet.absoluteFill}
            initialCameraPosition={{ target: center, zoom: 14.5 }}
            onPress={(e: any) => setCenter(e.nativeEvent)} 
          >
            <Circle
              center={center}
              radius={radius}
              strokeWidth={2}
              strokeColor={THEME.primary}
              fillColor="rgba(16, 185, 129, 0.15)" 
            />
            <Marker 
              position={center} 
              draggable={false}
            />
          </MapView>
        ) : (
          <View style={styles.loadingCenter}>
            <Text text="暂时无法获取当前位置" style={{ color: THEME.textMain, marginBottom: 12 }} />
            <TouchableOpacity onPress={() => void fetchCurrentFence()} style={styles.retryBtn}>
              <Text text="重新定位" style={{ color: THEME.surface, fontWeight: "bold" }} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={[styles.headerFloating, desktop && styles.desktopHeader]}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text text="←" style={{ fontSize: 22, color: THEME.textMain, fontWeight: 'bold' }} />
        </TouchableOpacity>
        
        <View style={styles.headerTextContainer}>
            <Text text="电子围栏设置" style={styles.headerTitle} />
            <Text text={elderName ? `守护: ${elderName}` : "点击地图调整中心点"} style={styles.headerSubtitle} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.bottomSheet, desktop && styles.desktopControls]}>
        {!desktop && <View style={styles.dragHandle} />}

        <View style={styles.controlRow}>
          <View>
            <Text text="安全半径" style={styles.labelTitle} />
            <Text text="超出此范围触发告警" style={styles.labelSub} 
            numberOfLines={1} 
            adjustsFontSizeToFit />
          </View>
          <View style={styles.radiusTag}>
            <Text text={`${Math.round(radius)}`} style={styles.radiusNum} />
            <Text text="米" style={styles.radiusUnit} />
          </View>
        </View>

        <View style={styles.sliderWrapper}>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={100}
              maximumValue={3000}
              step={50}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={THEME.primary}
              maximumTrackTintColor={THEME.border}
              thumbTintColor={THEME.primary}
            />
            <View style={styles.sliderTextRow}>
                <Text text="100m" style={styles.limitText} />
                <Text text="3km" style={styles.limitText} />
            </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text text="确认并发布围栏" 
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.saveBtnText} />
          )}
        </TouchableOpacity>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  desktopLayout: { ...studentFrame, flexDirection: "row", alignItems: "stretch", paddingHorizontal: 24, paddingTop: 96, paddingBottom: 25, gap: 24 },
  desktopMap: { overflow: "hidden", borderRadius: ui.radius.feature },
  desktopHeader: { top: 20, left: 24, right: 24, backgroundColor: ui.surface },
  desktopControls: { position: "relative", left: undefined, right: undefined, bottom: undefined, width: 335, alignSelf: "flex-start", borderRadius: ui.radius.surface, backgroundColor: ui.surface, elevation: 0, shadowOpacity: 0 },
  mapContainer: { flex: 1, backgroundColor: ui.wash },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: { backgroundColor: THEME.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18 },
  headerFloating: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: ui.radius.surface, shadowColor: THEME.textMain, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, zIndex: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.surface,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTextContainer: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.textMain },
  headerSubtitle: { fontSize: 12, color: THEME.primary, marginTop: 2, fontWeight: '500' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: THEME.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20, zIndex: 20,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 24,
  },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  labelTitle: { fontSize: 18, fontWeight: 'bold', color: THEME.textMain },
  labelSub: { fontSize: 13, color: THEME.textSub, marginTop: 4 },
  radiusTag: {
    flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#ECFDF5', 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16,
  },
  radiusNum: {
    fontSize: 22, fontWeight: '900', color: THEME.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  radiusUnit: { fontSize: 12, color: THEME.primary, marginLeft: 2, fontWeight: 'bold' },
  sliderWrapper: { marginBottom: 30 },
  sliderTextRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: -4 },
  limitText: { fontSize: 11, color: '#9CA3AF' },
  saveBtn: {
    backgroundColor: THEME.primary, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6, backgroundColor: '#9CA3AF' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
})
