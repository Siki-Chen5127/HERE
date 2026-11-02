import React, { FC, useEffect, useState, useCallback, useRef } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
  Animated,
  Easing,
  Alert
} from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon"


// 🟢 2. 引入本地 SQLite
import * as SQLite from 'expo-sqlite'
import { usersRepository } from "@/services/database/repositories"
import { mobileApi } from "@/services/hereApi"

import { colors } from "@/theme/colors"
import { $styles } from "@/theme/styles"

// --- 配置 ---
const { width: SCREEN_WIDTH } = Dimensions.get('window')

type StatsSnapshot = {
  sosCount: number
  nightTripCount: number
  weeklyData: number[]
  safetyScore: number
}

//  主题配色 (科技医疗风)
const THEME = {
  bg: "#F0F2F5", 
  primary: "#10B981", // 安全绿
  warning: "#F59E0B", // 警告橙
  danger: "#EF4444",  // 危险红
  card: "#FFFFFF",
  textMain: "#1F2937",
  textSub: "#6B7280",
  chartBar: "#34D399",
  scoreRing: "#D1FAE5",
  gradientTop: "#E0F2FE", // 顶部流光色
}

// 🟢 3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

// --- 辅助函数：获取本周日期标签 ---
const getDayLabels = () => {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
  const today = new Date().getDay()
  const labels = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(days[d.getDay()])
  }
  return labels
}

// --- 组件：自定义动态柱状图 ---
const SimpleBarChart = ({ data }: { data: number[] }) => {
  const maxVal = Math.max(...data, 1) 
  const labels = getDayLabels()

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartArea}>
        {data.map((value, index) => {
          const barHeight = (value / maxVal) * 100
          const isToday = index === 6
          
          return (
            <TouchableOpacity 
              key={index} 
              style={styles.chartColumn}
              activeOpacity={0.6}
              onPress={() => Alert.alert(labels[index], `活跃时长: ${value.toFixed(1)} 小时`)}
            >
              <Text style={styles.chartValue}>{value > 0 ? value.toFixed(1) : ''}</Text>
              <View style={[
                styles.chartBar, 
                { 
                  height: Math.max(barHeight, 4), 
                  backgroundColor: isToday ? THEME.primary : THEME.chartBar,
                  opacity: isToday ? 1 : 0.6
                }
              ]} />
              <Text style={[styles.chartLabel, isToday && { fontWeight: 'bold', color: THEME.primary }]}>
                {labels[index]}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// --- 组件：安全评分仪表盘 (带呼吸光环) ---
const SafetyScoreRing = ({ score, onPress }: { score: number, onPress: () => void }) => {
  let statusColor = THEME.primary
  let statusText = "安全状况良好"
  
  if (score < 60) {
    statusColor = THEME.danger
    statusText = "存在高危风险"
  } else if (score < 85) {
    statusColor = THEME.warning
    statusText = "需注意出行安全"
  }

  const scaleAnim = useRef(new Animated.Value(1)).current
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start()
  }, [])

  return (
    <TouchableOpacity style={styles.scoreContainer} onPress={onPress} activeOpacity={0.9}>
      <Animated.View style={[
        styles.scoreHalo, 
        { backgroundColor: statusColor, transform: [{ scale: scaleAnim }], opacity: 0.15 } 
      ]} />
      
      <View style={[styles.scoreCircle, { borderColor: statusColor }]}>
        <Text style={[styles.scoreNum, { color: statusColor }]} text={`${score}`} />
        <Text style={styles.scoreLabel} text="安全指数" />
      </View>
      
      <View style={styles.scoreBadge}>
        <Text 
          style={[styles.statusText, { color: statusColor }]} 
          text={statusText} 
          numberOfLines={1} 
          adjustsFontSizeToFit 
        />
      </View>
    </TouchableOpacity>
  )
}

export const StatisticsScreen: FC<any> = ({ navigation }) => {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [sosCount, setSosCount] = useState(0)
  const [nightTripCount, setNightTripCount] = useState(0)
  const [weeklyData, setWeeklyData] = useState<number[]>([0,0,0,0,0,0,0])
  const [safetyScore, setSafetyScore] = useState(100)
  const [totalDistance, setTotalDistance] = useState(0)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    const snapshot = await fetchStats()
    if (snapshot) await fetchAiAnalysis(snapshot)
    setLoading(false)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadAllData()
    setRefreshing(false)
  }, [])

  const fetchStats = async () => {
    try {
      // 🟢 4. 获取本地当前用户
      const activeUser = usersRepository.getActiveUser()
      if (!activeUser) throw new Error("未找到当前登录用户")
      const userId = String(activeUser.id)

      // 🟢 5. 从本地 AlertLog 查最近 7 天的报警次数
      // datetime('now', '-7 days') 是 SQLite 原生语法，完美兼容
      const alertQuery = db.getFirstSync<{count: number}>(
        "SELECT COUNT(*) as count FROM AlertLog WHERE userId = ? AND timestamp >= datetime('now', '-7 days')",
        userId
      )
      const alerts = alertQuery ? alertQuery.count : 0
      setSosCount(alerts)

      // 🟢 6. 从本地 ActivityLog 查最近 7 天的轨迹时间
      const logs = db.getAllSync<{timestamp: string}>(
        "SELECT timestamp FROM ActivityLog WHERE userId = ? AND timestamp >= datetime('now', '-7 days') ORDER BY timestamp DESC LIMIT 1000",
        userId
      )

      const dailyDuration = [0, 0, 0, 0, 0, 0, 0]
      let nightCount = 0
      const nightSet = new Set<string>()

      logs.forEach(log => {
        const date = new Date(log.timestamp)
        if (!date || isNaN(date.getTime())) return

        const today = new Date()
        today.setHours(0,0,0,0)
        const logDate = new Date(date)
        logDate.setHours(0,0,0,0)

        const diffTime = Math.abs(today.getTime() - logDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays >= 0 && diffDays <= 6) {
          const arrIndex = 6 - diffDays
          dailyDuration[arrIndex] += (10 / 3600)
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

      let score = 100 - (alerts * 15) - (nightCount * 2)
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
  }

  const fetchAiAnalysis = async (snapshot: StatsSnapshot) => {
    try {
      if (
        snapshot.sosCount === 0 &&
        snapshot.nightTripCount === 0 &&
        snapshot.weeklyData.every(v => v === 0)
      ) {
        setAiAnalysis("暂无足够数据，建议多使用 App 记录轨迹，让我更好地守护您。")
        return
      }

      const data = await mobileApi.createSafetyAnalysis({
        safety_score: snapshot.safetyScore,
        alert_count: snapshot.sosCount,
        night_trip_count: snapshot.nightTripCount,
        active_hours: snapshot.weeklyData.reduce((a,b) => a + b, 0),
      })
      setAiAnalysis(data.content)
    } catch (e) {
      setAiAnalysis("安全顾问暂时无法连接，请稍后下拉刷新。")
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.gradientTop} />
      
      <View style={styles.topDecoration} />

      <View style={styles.header}>
        <Text style={styles.headerTitle} text="生命状态周报" 
        numberOfLines={1}
        adjustsFontSizeToFit/>
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[THEME.primary]} />}
      >
        <SafetyScoreRing score={safetyScore} onPress={() => Alert.alert("安全指数说明", "基础分100分。每次报警扣15分，每次夜间高危时段出行扣2分。")} />

        <TouchableOpacity style={styles.aiCard} activeOpacity={0.9} onPress={() => Alert.alert("AI 顾问", "这是 DeepSeek 模型根据您的实际数据生成的个性化建议。")}>
          <View style={$styles.row}>
            <View style={styles.aiIconBox}>
              <Text style={{ fontSize: 18 }}>🤖</Text>
            </View>
            <Text style={styles.cardTitle} text="安全顾问分析"
             numberOfLines={1}        
            adjustsFontSizeToFit />
          </View>
          <View style={styles.aiBubble}>
            <Text style={styles.aiText} text={aiAnalysis || "正在分析您的生命安全状态..."} />
          </View>
        </TouchableOpacity>

        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={[styles.statItem, { borderLeftColor: THEME.danger, borderLeftWidth: 4 }]}
            onPress={() => Alert.alert("告警触发", "包含 SOS 呼救和跌倒检测触发次数")}
          >
            <Text style={styles.statLabel} text="告警触发" />
            <View style={$styles.row}>
                <Text style={[styles.statValue, { color: THEME.danger }]} text={`${sosCount}`} />
                <Text style={styles.statUnit} text="次" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statItem, { borderLeftColor: THEME.warning, borderLeftWidth: 4 }]}
            onPress={() => Alert.alert("夜间出行", "统计 21:00 至 05:00 之间的活动记录")}
          >
            <Text style={styles.statLabel} text="夜间出行" />
            <View style={$styles.row}>
                <Text style={[styles.statValue, { color: THEME.warning }]} text={`${nightTripCount}`} />
                <Text style={styles.statUnit} text="时段" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.statItem, { borderLeftColor: THEME.primary, borderLeftWidth: 4 }]}
            onPress={() => Alert.alert("活跃里程", "根据活跃时长估算的近似移动距离")}
          >
            <Text style={styles.statLabel} text="活跃里程" />
            <View style={$styles.row}>
                <Text style={[styles.statValue, { color: THEME.primary }]} text={`${totalDistance}`} />
                <Text style={styles.statUnit} text="km" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <View style={$styles.rowBetween}>
             <Text style={styles.cardTitle} text="近7日活跃趋势" />
             <Text style={{ fontSize: 10, color: THEME.textSub }} text="单位: 小时" />
          </View>
          <SimpleBarChart data={weeklyData} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  
  topDecoration: {
    position: 'absolute', top: -100, left: -50, width: SCREEN_WIDTH + 100, height: 300,
    backgroundColor: THEME.gradientTop, borderRadius: 150, opacity: 0.6, transform: [{ scaleX: 1.5 }],
  },

  header: { paddingHorizontal: 100, paddingTop: 40, paddingBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: THEME.textMain },
  content: { paddingHorizontal: 20 },

  scoreContainer: { alignItems: 'center', marginVertical: 24, justifyContent: 'center' },
  scoreHalo: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  scoreCircle: {
    width: 140, height: 140, borderRadius: 70, borderWidth: 8, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'white', elevation: 4, shadowColor: THEME.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1,
  },
  scoreNum: { fontSize: 30, fontWeight: 'bold', includeFontPadding: false },
  scoreLabel: { fontSize: 12, color: THEME.textSub },
  scoreBadge: {
    marginTop: -16, backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    minWidth: 120, alignItems: 'center'
  },
  statusText: { fontSize: 14, fontWeight: 'bold' },

  aiCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2,
    shadowColor: THEME.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
  },
  aiIconBox: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E7FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  aiBubble: { marginTop: 12, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, borderTopLeftRadius: 2 },
  aiText: { fontSize: 14, lineHeight: 22, color: THEME.textMain },

  gridContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 10 },
  statItem: {
    flex: 1, backgroundColor: THEME.card, padding: 12, borderRadius: 12, elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
  },
  statLabel: { fontSize: 12, color: THEME.textSub, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statUnit: { fontSize: 10, color: THEME.textSub, marginLeft: 2, marginTop: 6 },

  chartCard: {
    backgroundColor: THEME.card, borderRadius: 16, padding: 20, elevation: 2, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: THEME.textMain },
  chartContainer: { marginTop: 20, height: 150 },
  chartArea: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  chartColumn: { alignItems: 'center', flex: 1 },
  chartValue: { fontSize: 10, color: THEME.textSub, marginBottom: 4 },
  chartBar: { width: 12, borderRadius: 6 },
  chartLabel: { fontSize: 10, color: THEME.textSub, marginTop: 8 },
})
