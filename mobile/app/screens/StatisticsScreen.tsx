import { Alert } from "@/components/Feedback"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"
import { FC, useEffect, useState, useCallback, useRef } from "react"
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as SQLite from "expo-sqlite"
import Feather from "@expo/vector-icons/Feather"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { usersRepository } from "@/services/database/repositories"
import { mobileApi } from "@/services/hereApi"
import { useScreenChrome } from "@/utils/useScreenChrome"

import { GlassSurface } from "./MainScreen/components/GlassSurface"
import { homeColors as C } from "./MainScreen/components/homeAppearance"
import { SoftPressable } from "./MainScreen/components/SoftPressable"

type StatsSnapshot = {
  sosCount: number
  nightTripCount: number
  weeklyData: number[]
  safetyScore: number
}

const PALETTE = {
  bar: "#A0B69B",
  track: "rgba(247,249,234,0.23)",
  heroText: "#F7F9EE",
  heroMuted: "#E1EBD9",
  unit: "rgba(247,249,238,0.7)",
  divider: "rgba(65,91,69,0.12)",
  tag: "rgba(255,255,255,0.48)",
}

const db = SQLite.openDatabaseSync("assignment.db")

const getDayLabels = () => {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + index)
    return days[date.getDay()]
  })
}

const getDateRange = () => {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return `${start.getMonth() + 1}.${start.getDate()} — ${end.getMonth() + 1}.${end.getDate()}`
}

const SimpleBarChart = ({ data, largeText }: { data: number[]; largeText: boolean }) => {
  const max = Math.max(...data, 1)
  const labels = getDayLabels()
  const hasData = data.some((value) => value > 0)
  return (
    <View>
      {!hasData && <Text text="这周还没有活动记录" style={styles.chartEmpty} />}
      <ScrollView
        horizontal={largeText}
        scrollEnabled={largeText}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chartContent}
      >
        <View style={[styles.chartArea, largeText && styles.chartAreaWide]}>
          {data.map((value, index) => (
            <SoftPressable
              key={index}
              style={styles.chartColumn}
              accessibilityRole="button"
              accessibilityLabel={`${index === 6 ? "今天" : labels[index]}，估算活跃时长 ${value.toFixed(1)} 小时`}
              onPress={() =>
                Alert.alert(
                  index === 6 ? "今天" : labels[index],
                  `估算活跃时长：${value.toFixed(1)} 小时。根据本机轨迹记录计算。`,
                )
              }
            >
              <View style={styles.chartCell}>
                <View style={styles.chartPlot}>
                  {value > 0 && <Text text={value.toFixed(1)} style={styles.chartValue} />}
                  <LinearGradient
                    colors={index === 6 ? ["#7A9D7C", "#376F55"] : ["#BCCCB1", "#91AC8B"]}
                    style={[
                      styles.chartBar,
                      { height: Math.max((value / max) * 94, 4) },
                      !hasData && styles.emptyBar,
                    ]}
                  />
                </View>
                <Text
                  text={index === 6 ? "今天" : labels[index]}
                  style={[styles.chartLabel, index === 6 && styles.todayLabel]}
                />
              </View>
            </SoftPressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export const StatisticsScreen: FC<any> = () => {
  const insets = useSafeAreaInsets()
  const { fontScale, width } = useViewport()
  const largeText = fontScale >= 1.3
  const desktop = width >= 1120 && !largeText
  const preview = process.env.EXPO_PUBLIC_HERE_PREVIEW_STATS === "1"
  useScreenChrome(C.background)

  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [aiAnalysis, setAiAnalysis] = useState("")
  const [sosCount, setSosCount] = useState(0)
  const [nightTripCount, setNightTripCount] = useState(0)
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [safetyScore, setSafetyScore] = useState(100)
  const [totalDistance, setTotalDistance] = useState(0)

  const inFlight = useRef(false)

  const fetchStats = useCallback(async () => {
    try {
      // 🟢 4. 获取本地当前用户
      const activeUser = usersRepository.getActiveUser()
      if (!activeUser) throw new Error("未找到当前登录用户")
      const userId = String(activeUser.id)

      // 🟢 5. 从本地 AlertLog 查最近 7 天的报警次数
      // datetime('now', '-7 days') 是 SQLite 原生语法，完美兼容
      const alertQuery = db.getFirstSync<{ count: number }>(
        "SELECT COUNT(*) as count FROM AlertLog WHERE userId = ? AND timestamp >= datetime('now', '-7 days')",
        userId,
      )
      const alerts = alertQuery ? alertQuery.count : 0
      setSosCount(alerts)

      // 🟢 6. 从本地 ActivityLog 查最近 7 天的轨迹时间
      const logs = db.getAllSync<{ timestamp: string }>(
        "SELECT timestamp FROM ActivityLog WHERE userId = ? AND timestamp >= datetime('now', '-7 days') ORDER BY timestamp DESC LIMIT 1000",
        userId,
      )

      const dailyDuration = [0, 0, 0, 0, 0, 0, 0]
      let nightCount = 0
      const nightSet = new Set<string>()

      logs.forEach((log) => {
        const date = new Date(log.timestamp)
        if (!date || isNaN(date.getTime())) return

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const logDate = new Date(date)
        logDate.setHours(0, 0, 0, 0)

        const diffTime = Math.abs(today.getTime() - logDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 6) {
          const arrIndex = 6 - diffDays
          dailyDuration[arrIndex] += 10 / 3600
        }

        const h = date.getHours()
        if (h >= 21 || h < 5) {
          const key = `${date.getMonth()}-${date.getDate()}-${h}`
          if (!nightSet.has(key)) {
            nightCount++
            nightSet.add(key)
          }
        }
      })

      setWeeklyData(dailyDuration)
      setNightTripCount(nightCount)

      const totalHours = dailyDuration.reduce((a, b) => a + b, 0)
      setTotalDistance(parseFloat((totalHours * 4).toFixed(1)))

      let score = 100 - alerts * 15 - nightCount * 2
      if (score < 0) score = 0
      setSafetyScore(score)

      return {
        sosCount: alerts,
        nightTripCount: nightCount,
        weeklyData: dailyDuration,
        safetyScore: score,
      }
    } catch (e) {
      console.error("本地统计数据获取失败", e)
      return null
    }
  }, [])

  const fetchAiAnalysis = useCallback(async (snapshot: StatsSnapshot) => {
    try {
      if (
        snapshot.sosCount === 0 &&
        snapshot.nightTripCount === 0 &&
        snapshot.weeklyData.every((v) => v === 0)
      ) {
        setAiAnalysis("这周还没有足够的活动记录，暂时无法生成小结。")
        return
      }

      const data = await mobileApi.createSafetyAnalysis({
        safety_score: snapshot.safetyScore,
        alert_count: snapshot.sosCount,
        night_trip_count: snapshot.nightTripCount,
        active_hours: snapshot.weeklyData.reduce((a, b) => a + b, 0),
      })
      setAiAnalysis(data.content)
    } catch {
      setAiAnalysis("暂时无法生成小结，稍后下拉刷新再试。")
    }
  }, [])

  const loadAllData = useCallback(async () => {
    if (preview) {
      setWeeklyData([1.1, 2.4, 1.6, 3.2, 2.6, 1.7, 2.9])
      setSosCount(1)
      setNightTripCount(2)
      setSafetyScore(81)
      setTotalDistance(62)
      setAiAnalysis("过去七天的活动分布总体平稳，周中较多。你可以点选柱形查看每天的活动时长。")
      return
    }
    if (inFlight.current) return
    inFlight.current = true
    setLoading(true)
    try {
      const snapshot = await fetchStats()
      if (snapshot) await fetchAiAnalysis(snapshot)
    } finally {
      inFlight.current = false
      setLoading(false)
    }
  }, [fetchStats, fetchAiAnalysis, preview])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadAllData()
    } finally {
      setRefreshing(false)
    }
  }, [loadAllData])

  useEffect(() => {
    void loadAllData()
  }, [loadAllData])

  const hasData = sosCount > 0 || nightTripCount > 0 || weeklyData.some((value) => value > 0)
  const totalHours = weeklyData.reduce((sum, value) => sum + value, 0)
  const explainScore = () =>
    Alert.alert(
      "参考分说明",
      "沿用当前记录规则：基础分 100 分，每次告警扣 15 分，每个夜间活动时段扣 2 分，最低为 0 分。此分数不代表心理或健康评估。",
    )

  return (
    <View style={styles.container}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={require("../../assets/images/home-ambient.png")}
          resizeMode="cover"
          style={styles.background}
        />
        <LinearGradient
          colors={["rgba(248,247,233,0.15)", "rgba(242,245,232,0.76)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <ScrollView
        testID="weekly-report-scroll"
        contentContainerStyle={[styles.content, desktop && styles.desktopContent, { paddingTop: insets.top + (desktop ? 35 : 18) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      >
        <View style={styles.header}>
          <Text text="生命状态周报" style={styles.headerTitle} />
          <View style={styles.headerDetails}>
            <Text text={preview ? "示例数据 · 七日活动" : "回顾过去 7 天的活动"} style={styles.subtitle} />
            <View style={styles.dateTag}>
              <Feather name="calendar" size={12} color={C.secondary} />
              <Text text={getDateRange()} style={styles.dateText} />
            </View>
          </View>
        </View>

        <View style={desktop && styles.desktopGrid}>
        <View style={desktop && styles.summaryColumn}>
        <SoftPressable
          testID="weekly-score"
          onPress={explainScore}
          accessibilityRole="button"
          accessibilityLabel="查看记录参考分的计算说明"
        >
          <GlassSurface green contentStyle={styles.summary}>
            <View style={styles.summaryHeading}>
              <Text text="这一周的记录" style={styles.heroEyebrow} />
              <Feather name="info" size={18} color={PALETTE.heroMuted} />
            </View>
            <View style={styles.scoreLine}>
              <Text text={hasData ? String(safetyScore) : "—"} style={styles.scoreNumber} />
              <Text text="记录参考分" style={styles.scoreUnit} />
            </View>
            {hasData ? (
              <>
                <View style={styles.scoreTrack}>
                  <View style={[styles.scoreFill, { width: `${safetyScore}%` }]} />
                </View>
                <Text
                  text={`近 7 天估算活跃 ${totalHours.toFixed(1)} 小时`}
                  style={styles.heroDescription}
                />
              </>
            ) : (
              <Text
                text={loading ? "正在整理本机记录…" : "还没有足够记录，先从今天开始。"}
                style={styles.heroDescription}
              />
            )}
            <Text text="仅供回顾，不代表心理或健康评估" style={styles.heroFootnote} />
          </GlassSurface>
        </SoftPressable>

        <View style={[styles.metrics, largeText && styles.metricsStack]}>
          {[
            {
              title: "告警记录",
              value: String(sosCount),
              unit: "次",
              icon: "bell" as const,
              detail: "统计近 7 天本机记录的告警次数。",
            },
            {
              title: "夜间活动",
              value: String(nightTripCount),
              unit: "时段",
              icon: "moon" as const,
              detail:
                "统计 21:00 至次日 05:00 的活动记录，同一小时内合并为一个时段，不等于出行次数。",
            },
            {
              title: "估算里程",
              value: totalDistance.toFixed(1),
              unit: "km",
              icon: "map-pin" as const,
              detail: "由估算活跃时长乘以每小时 4 公里计算，并非 GPS 实测里程。",
            },
          ].map((item) => (
            <SoftPressable
              key={item.title}
              style={styles.metricWrapper}
              onPress={() => Alert.alert(item.title, item.detail)}
              accessibilityRole="button"
              accessibilityLabel={`${item.title} ${item.value} ${item.unit}，点击查看说明`}
            >
              <GlassSurface contentStyle={styles.metricCard}>
                <Feather name={item.icon} size={18} color={C.primary} />
                <Text text={item.title} style={styles.metricLabel} />
                <View style={styles.metricValueRow}>
                  <Text text={item.value} style={styles.metricValue} />
                  <Text text={item.unit} style={styles.metricUnit} />
                </View>
              </GlassSurface>
            </SoftPressable>
          ))}
        </View>
        </View>

        <View style={desktop && styles.trendColumn}>
        <GlassSurface style={styles.section} contentStyle={styles.sectionContent}>
          <View style={styles.sectionHeading}>
            <Text text="近 7 日活跃趋势" style={styles.cardTitle} />
            <Feather name="bar-chart-2" size={19} color={C.primary} />
          </View>
          <Text text="估算活跃时长 · 小时" style={styles.sectionHint} />
          <SimpleBarChart data={weeklyData} largeText={largeText} />
          <Text
            text="根据本机轨迹记录估算，点击柱状图查看当天数据。"
            style={styles.chartFootnote}
          />
        </GlassSurface>

        <GlassSurface contentStyle={styles.sectionContent}>
          <View style={styles.sectionHeading}>
            <View style={styles.analysisHeading}>
              <Feather name="message-circle" size={19} color={C.primary} />
              <Text text="本周小结" style={styles.cardTitle} />
            </View>
            <View style={styles.aiTag}>
              <Text text={preview ? "示例" : "AI"} style={styles.aiTagText} />
            </View>
          </View>
          <Text text="基于以上活动记录生成" style={styles.sectionHint} />
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={C.primary} />
              <Text text="正在整理小结…" style={styles.loadingText} />
            </View>
          ) : (
            <Text
              text={aiAnalysis || "暂无小结，下拉可以刷新。"}
              style={styles.analysisText}
              selectable
            />
          )}
        </GlassSurface>
        </View>
        </View>
        {desktop && (
          <View style={styles.weeklyDetails}>
            <Text text="七日明细" style={styles.cardTitle} />
            <View style={styles.detailDays}>
              {Array.from({ length: 7 }, (_, index) => {
                const date = new Date()
                date.setDate(date.getDate() - 6 + index)
                const formatted = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(date)
                return (
                  <View key={index} style={[styles.detailDay, index === 6 && styles.currentDetailDay]}>
                    <Text text={index === 6 ? "今天" : formatted} style={styles.detailDate} />
                    <Text text={hasData ? `${weeklyData[index].toFixed(1)} 小时` : "暂无记录"} style={styles.detailValue} />
                  </View>
                )
              })}
            </View>
          </View>
        )}
        <Text text={preview ? "当前仅展示预览示例" : "数据来自当前账号在本机的记录 · 下拉刷新"} style={styles.footer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  desktopContent: { ...studentFrame, paddingHorizontal: 36 },
  desktopGrid: { flexDirection: "row", alignItems: "flex-start", gap: 28 },
  summaryColumn: { flex: 1, minWidth: 0 },
  trendColumn: { flex: 1.45, minWidth: 0, borderLeftWidth: 1, borderColor: ui.line, paddingLeft: 26 },
  weeklyDetails: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: ui.line, marginTop: 24, paddingVertical: 20 },
  detailDays: { flexDirection: "row", marginTop: 12, gap: 7 },
  detailDay: { flex: 1, minWidth: 0, gap: 7, padding: 12, borderLeftWidth: 1, borderColor: ui.line },
  currentDetailDay: { backgroundColor: ui.tint, borderRadius: ui.radius.nested, borderLeftWidth: 0 },
  detailDate: { fontSize: 13, color: ui.muted },
  detailValue: { color: ui.ink, fontSize: 16, fontWeight: "600" },
  aiTag: {
    backgroundColor: PALETTE.tag,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  aiTagText: { color: C.primary, fontSize: 10, fontWeight: "600", lineHeight: 16 },
  analysisHeading: { alignItems: "center", flexDirection: "row", gap: 8 },
  analysisText: { color: C.text, fontSize: 14, lineHeight: 25, marginTop: 16 },
  background: { height: "100%", opacity: 0.8, width: "100%" },
  cardTitle: { color: C.text, flexShrink: 1, fontSize: 16, fontWeight: "600", lineHeight: 25 },
  chartArea: { alignItems: "flex-end", flex: 1, flexDirection: "row", gap: 2 },
  chartAreaWide: { minWidth: 460 },
  chartBar: { borderRadius: 8, marginTop: 5, overflow: "hidden", width: 15 },
  chartCell: { alignItems: "center", paddingTop: 10 },
  chartColumn: { flex: 1 },
  chartContent: { flexGrow: 1 },
  chartEmpty: {
    color: C.secondary,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 18,
    textAlign: "center",
  },
  chartFootnote: { color: C.secondary, fontSize: 11, lineHeight: 18, marginTop: 16 },
  chartLabel: { color: C.secondary, fontSize: 11, lineHeight: 18, marginTop: 10 },
  chartPlot: { alignItems: "center", justifyContent: "flex-end", minHeight: 132 },
  chartValue: { color: C.secondary, fontSize: 10, lineHeight: 17 },
  container: { backgroundColor: C.background, flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: 22 },
  dateTag: {
    alignItems: "center",
    backgroundColor: PALETTE.tag,
    borderRadius: 10,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateText: { color: C.secondary, fontSize: 11, lineHeight: 18 },
  emptyBar: { opacity: 0.35 },
  footer: { color: C.secondary, fontSize: 11, lineHeight: 19, marginTop: 20, textAlign: "center" },
  header: { marginBottom: 22 },
  headerDetails: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 7,
  },
  headerTitle: { color: C.text, fontSize: 28, fontWeight: "600", lineHeight: 40 },
  heroDescription: { color: PALETTE.heroMuted, fontSize: 14, lineHeight: 23, marginTop: 15 },
  heroEyebrow: { color: PALETTE.heroMuted, fontSize: 13, lineHeight: 21 },
  heroFootnote: { color: PALETTE.heroMuted, fontSize: 10, lineHeight: 18, marginTop: 8 },
  loadingRow: { alignItems: "center", flexDirection: "row", gap: 9, paddingVertical: 24 },
  loadingText: { color: C.secondary, flex: 1, fontSize: 13, lineHeight: 22 },
  metricCard: { paddingHorizontal: 12, paddingVertical: 16 },
  metricLabel: { color: C.secondary, fontSize: 11, lineHeight: 18, marginTop: 10 },
  metricUnit: { color: C.secondary, fontSize: 10, lineHeight: 18, marginBottom: 2 },
  metricValue: { color: C.text, fontSize: 23, fontWeight: "500", lineHeight: 33 },
  metricValueRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 4,
  },
  metricWrapper: { flex: 1 },
  metrics: { flexDirection: "row", gap: 10, marginVertical: 18 },
  metricsStack: { flexDirection: "column" },
  scoreFill: { backgroundColor: PALETTE.heroMuted, borderRadius: 2, height: 4 },
  scoreLine: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  scoreNumber: { color: PALETTE.heroText, fontSize: 48, fontWeight: "500", lineHeight: 62 },
  scoreTrack: {
    backgroundColor: PALETTE.track,
    borderRadius: 2,
    height: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  scoreUnit: { color: PALETTE.heroMuted, fontSize: 13, lineHeight: 22 },
  section: { marginBottom: 18 },
  sectionContent: { padding: 18 },
  sectionHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  sectionHint: { color: C.secondary, fontSize: 11, lineHeight: 18, marginTop: 4 },
  subtitle: { color: C.secondary, fontSize: 13, lineHeight: 21 },
  summary: { padding: 22 },
  summaryHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  todayLabel: { color: C.primary, fontWeight: "600" },
})
