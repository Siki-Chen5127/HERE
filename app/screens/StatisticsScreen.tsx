import React, { FC, useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  ScrollView
} from "react-native"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import AV from "leancloud-storage/core"

// --- 配置 ---
const DEEPSEEK_KEY = 'sk-adb6bdd1ab434f9780fdca889e4fdb55'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'
const SCREEN_WIDTH = Dimensions.get("window").width

const COLORS = {
  primary: '#10B981', // 绿色
  primaryLight: '#A7F3D0',
  primaryDark: '#047857',
  bg: '#FFFFFF',
  cardBg: '#F9FAFB',
  textMain: '#1F2937',
  textSub: '#6B7280',
  blue50: '#EFF6FF',
  blue500: '#3B82F6',
  orange50: '#FFF7ED',
  orange500: '#F97316',
}

// --- 自定义零依赖柱状图组件 ---
const SimpleBarChart = ({ data }: { data: number[] }) => {
  const maxVal = Math.max(...data, 1) 
  const labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

  return (
    <View style={$chartStyles.container}>
      <View style={$chartStyles.chartArea}>
        {data.map((value, index) => {
          const barHeight = (value / maxVal) * 120
          return (
            <View key={index} style={$chartStyles.column}>
              <Text style={$chartStyles.valueText}>{value > 0 ? value : ''}</Text>
              <View style={[$chartStyles.bar, { height: barHeight || 4 }]} />
              <Text style={$chartStyles.labelText}>{labels[index]}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export const StatisticsScreen: FC<any> = ({ navigation }) => {
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState("")
  const [sosCount, setSosCount] = useState(0)
  const [nightTripCount, setNightTripCount] = useState(0)
  
  // 模拟一周外出时长数据 (为了好看暂时保留模拟，实际可从 ActivityLog 计算)
  const [weeklyData, setWeeklyData] = useState([2.5, 3.0, 1.5, 4.0, 2.0, 5.5, 3.2])

  useEffect(() => {
    fetchStats()
    fetchAiAnalysis()
  }, [])

  const fetchStats = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      
      // 1. 查询本周报警次数 (SOS + 跌倒)
      const alertQuery = new AV.Query('AlertLog')
      alertQuery.equalTo('user', currentUser)
      // 可以加上时间限制，比如查询最近7天
      // const lastWeek = new Date(); lastWeek.setDate(lastWeek.getDate() - 7);
      // alertQuery.greaterThan('createdAt', lastWeek);
      const count = await alertQuery.count()
      setSosCount(count)

      // 2. 查询夜间出行 (21:00 - 05:00)
      const activityQuery = new AV.Query('ActivityLog')
      activityQuery.equalTo('user', currentUser)
      activityQuery.limit(1000)
      const activities = await activityQuery.find()

      let nightCount = 0
      // 简单去重逻辑：同一小时内的多次记录只算一次
      const countedHours = new Set() 

      activities.forEach(log => {
        const date = log.createdAt
        if (!date) return
        
        const hour = date.getHours()
        // 夜间判定：晚上9点后 或 早上5点前
        if (hour >= 21 || hour < 5) {
          // 生成唯一key: 日期-小时 (例如 "11-28-22")
          const timeKey = `${date.getDate()}-${hour}`
          if (!countedHours.has(timeKey)) {
            nightCount++
            countedHours.add(timeKey)
          }
        }
      })
      setNightTripCount(nightCount)

    } catch (e) {
      console.error("统计获取失败", e)
    }
  }

  const fetchAiAnalysis = async () => {
    setLoading(true)
    setAiAnalysis("") 

    try {
      // --- 修复点：使用 await User.currentAsync() ---
      const currentUser = await AV.User.currentAsync()
      const userId = currentUser ? currentUser.id : 'unknown'

      // 动态生成用户摘要
      const userSummary = `
        用户 ID: ${userId}
        本周触发报警次数: ${sosCount} 次
        夜间高危时段(21:00-05:00)活动次数: ${nightTripCount} 次
        活动范围: 主要是校园及周边
      `

      const response = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "你是一个贴心的家庭安全管家。请根据用户数据，生成一段简短、温暖的安全周报评语（100字以内）。如果数据正常请给予鼓励，如果有报警请提醒注意安全。" },
            { role: "user", content: userSummary }
          ],
          temperature: 0.7
        })
      })

      const data = await response.json()
      if (data.choices && data.choices.length > 0) {
        setAiAnalysis(data.choices[0].message.content)
      } else {
        setAiAnalysis("暂无法生成分析报告。")
      }
    } catch (error) {
      console.error("AI 分析失败", error)
      setAiAnalysis("网络连接稍有波动，分析暂停。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen 
      preset="scroll" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      backgroundColor={COLORS.bg}

    >
      <View style={$styles.header}>
        <Text style={$styles.headerTitle} text="安全周报" />
      </View>

      <View style={$styles.content}>
        
        {/* 1. AI 洞察卡片 */}
        <View style={$styles.aiCard}>
          <Text style={$styles.bgIcon}>❝</Text> 
          
          <View style={{ zIndex: 1 }}>
            <View style={$styles.cardHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: 'white', marginRight: 8 }}>✨</Text>
                <Text style={$styles.cardTitle} text="AI 轨迹综合洞察" />
              </View>
              <TouchableOpacity style={$styles.refreshBtn} onPress={fetchAiAnalysis} disabled={loading}>
                <Text style={{ color: 'white', fontSize: 12 }} text={loading ? "分析中..." : "🔄 刷新"} />
              </TouchableOpacity>
            </View>

            <View style={$styles.analysisBox}>
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                  <ActivityIndicator color="white" size="small" />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', marginLeft: 8, fontSize: 12 }}>DeepSeek 正在分析您的活动轨迹...</Text>
                </View>
              ) : (
                <Text style={$styles.analysisText} text={aiAnalysis || "点击刷新生成本周安全报告"} />
              )}
            </View>
          </View>
        </View>

        {/* 2. 原生手写图表卡片 */}
        <View style={$styles.chartCard}>
          <Text style={$styles.sectionTitle} text="外出时长统计 (小时)" />
          <SimpleBarChart data={weeklyData} />
        </View>

        {/* 3. 数据网格 */}
        <View style={$styles.gridContainer}>
          <View style={[$styles.statBox, { backgroundColor: COLORS.blue50 }]}>
            <Text style={{ fontSize: 24, color: COLORS.blue500, marginBottom: 8 }}>🌙</Text>
            <Text style={$styles.statNumber} text={`${nightTripCount} 次`} />
            <Text style={$styles.statLabel} text="本周夜间高危出行" />
            <Text style={{ fontSize: 10, color: COLORS.textSub, marginTop: 4 }} text="(21:00 - 05:00)" />
          </View>

          <View style={[$styles.statBox, { backgroundColor: COLORS.orange50 }]}>
            <Text style={{ fontSize: 24, color: COLORS.orange500, marginBottom: 8 }}>⚠️</Text>
            <Text style={$styles.statNumber} text={`${sosCount} 次`} />
            <Text style={$styles.statLabel} text="触发跌倒/SOS警报" />
          </View>
        </View>

      </View>
      
      <View style={{ height: 100 }} />
    </Screen>
  )
}

const $chartStyles = StyleSheet.create({
  container: {
    marginTop: 10,
    height: 160,
    justifyContent: 'flex-end',
  } as ViewStyle,
  chartArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '100%',
    paddingHorizontal: 8,
  } as ViewStyle,
  column: {
    alignItems: 'center',
    width: 30, 
  } as ViewStyle,
  bar: {
    width: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    marginBottom: 8,
  } as ViewStyle,
  valueText: {
    fontSize: 10,
    color: COLORS.textSub,
    marginBottom: 4,
  } as TextStyle,
  labelText: {
    fontSize: 12,
    color: COLORS.textSub,
  } as TextStyle,
})

const $styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.bg,
  } as ViewStyle,
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  content: { padding: 24, paddingTop: 16 } as ViewStyle,
  aiCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,
  bgIcon: {
    position: 'absolute',
    top: -10,
    left: 10,
    fontSize: 80,
    color: 'rgba(255,255,255,0.1)',
    fontWeight: 'bold',
  } as TextStyle,
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  } as ViewStyle,
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' } as TextStyle,
  refreshBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  analysisBox: { minHeight: 60 } as ViewStyle,
  analysisText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    lineHeight: 22,
  } as TextStyle,
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 8 } as TextStyle,
  gridContainer: {
    flexDirection: 'row',
    gap: 16,
  } as ViewStyle,
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-start',
  } as ViewStyle,
  statNumber: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 } as TextStyle,
  statLabel: { fontSize: 12, color: COLORS.textSub } as TextStyle,
})