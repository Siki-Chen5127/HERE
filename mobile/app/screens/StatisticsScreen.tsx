import { Alert, feedback } from "@/components/Feedback"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"
import { useScreenChrome } from "@/utils/useScreenChrome"
import { mobileApi, getHereApiErrorMessage, type StudentUser, type WeeklyReflection } from "@/services/hereApi"
import {
  loadWeeklySnapshot, reflectionInput, getReflectionCache, saveReflectionCache, saveNightNote,
  nightOptions, weekBounds, type WeeklySnapshot, type NightPeriod, type NightKind,
} from "@/services/weeklyReflection"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Feather from "@expo/vector-icons/Feather"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { GlassSurface } from "./MainScreen/components/GlassSurface"
import { homeColors as C } from "./MainScreen/components/homeAppearance"

const moodLabels = { good: "还不错", okay: "一般", tired: "有点累" }
const formatDay = (day: string) => day.slice(5).replace("-", ".")
const periodLabel = (period: NightPeriod) => formatDay(period.day) + " · " +
  String(period.hour).padStart(2, "0") + ":00–" + String((period.hour + 1) % 24).padStart(2, "0") + ":00"

export function StatisticsScreen() {
  const { currentUser } = useAuth()
  useScreenChrome(C.background)
  return currentUser ? <WeeklyReport key={currentUser.id} user={currentUser} /> :
    <View style={styles.container}><Text text="请先登录，查看自己的周报。" style={styles.centerHint} /></View>
}

function WeeklyReport({ user }: { user: StudentUser }) {
  const insets = useSafeAreaInsets()
  const { width, fontScale } = useViewport()
  const desktop = width >= 1120 && fontScale < 1.3
  const largeText = fontScale >= 1.3
  const [snapshot, setSnapshot] = useState<WeeklySnapshot | null>(null)
  const [cached, setCached] = useState(() => getReflectionCache(user.id))
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [readError, setReadError] = useState("")
  const [aiError, setAiError] = useState("")
  const [showScore, setShowScore] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState<NightPeriod | null>(null)
  const [kind, setKind] = useState<NightKind>("routine")
  const [note, setNote] = useState("")
  const revision = useRef(0)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; revision.current++ } }, [])

  const refresh = useCallback(async () => {
    const request = ++revision.current
    setLoading(true)
    setReadError("")
    try {
      const data = await loadWeeklySnapshot(user)
      if (mounted.current && request === revision.current) setSnapshot(data)
    } catch {
      if (mounted.current && request === revision.current) {
        setSnapshot(null)
        setReadError("暂时无法读取本机记录，请刷新重试。")
      }
    } finally {
      if (mounted.current && request === revision.current) setLoading(false)
    }
  }, [user])
  useFocusEffect(useCallback(() => { void refresh() }, [refresh]))
  const input = snapshot ? reflectionInput(snapshot) : null
  // The local result is shown only when it matches the current data and date range.
  const signature = snapshot && input ? JSON.stringify({ days: snapshot.days, input }) : ""
  const reflection = signature && cached?.signature === signature ? cached.result : null
  const canGenerate = !!input && (!!input.moods.length || !!input.survey) && !loading && !generating

  const generate = async () => {
    if (!input || !canGenerate) return
    setGenerating(true)
    setAiError("")
    try {
      const result: WeeklyReflection = await mobileApi.createWeeklyReflection(input)
      if (!mounted.current) return
      if (typeof result.summary !== "string" || !result.summary.trim()) throw Error("回顾结果无效")
      const next = { signature, result }
      setCached(next)
      saveReflectionCache(user.id, next)
    } catch (error) {
      if (mounted.current) setAiError(getHereApiErrorMessage(error, "暂时无法生成回顾，请稍后重试。"))
    } finally {
      if (mounted.current) setGenerating(false)
    }
  }
  const confirmGenerate = () => Alert.alert("生成本周 AI 回顾",
    "将发送本周心情、已保存的近况问卷文字、求助进度数量和已选择的夜间说明类别给 AI 服务；不会发送日记、对话、位置坐标或夜间备注。回顾结果仅保存在本机，不会自动发送给辅导员。请确认是否继续。",
    [{ text: "先不生成", style: "cancel" }, { text: "确认生成", onPress: () => void generate() }])
  const startEdit = (period: NightPeriod) => {
    const existing = snapshot?.notes[period.key]
    setKind(existing?.kind || "routine")
    setNote(existing?.note || "")
    setEditing(period)
  }
  const submitNote = () => {
    if (!snapshot || !editing) return
    const next = saveNightNote(user.id, editing, snapshot.notes, { kind, note: note.trim() })
    if (!next) { feedback.error("保存失败", "请检查本机存储后重试。"); return }
    setSnapshot(current => current ? { ...current, notes: next } : current)
    setEditing(null)
    feedback.success("已保存说明", "这些记录不会导致任何扣分。")
  }
  const days = snapshot?.days || weekBounds().days
  const moodCount = snapshot?.moods.length || 0
  const nightCount = snapshot?.nightPeriods.length || 0
  const explainedCount = snapshot?.nightPeriods.filter(period => !!snapshot.notes[period.key]).length || 0
  const support = snapshot?.support
  const activities = snapshot?.activity || days.map(() => 0)
  const maxActivity = Math.max(1, ...activities)
  const labelDate = formatDay(days[0]) + " — " + formatDay(days[6])
  const periods = expanded ? snapshot?.nightPeriods : snapshot?.nightPeriods.slice(0, 3)

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        <Image source={require("../../assets/images/home-ambient.png")} resizeMode="cover" style={styles.background} />
        <LinearGradient colors={["rgba(248,247,233,0.15)", "rgba(242,245,232,0.76)"]} style={StyleSheet.absoluteFill} />
      </View>
      <ScrollView testID="weekly-report-scroll" style={styles.scroll}
        contentContainerStyle={[styles.content, desktop && styles.desktopContent, { paddingTop: insets.top + 24 }]}
        showsVerticalScrollIndicator={true}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={C.primary} />}>
        <View style={styles.header}>
          <Text text="我的一周" style={styles.headerTitle} />
          <Text text="给自己一点时间，看看这一周过得怎么样。" style={styles.centerHint} />
          <View style={styles.dateTag}><Feather name="calendar" size={13} color={C.secondary} /><Text text={labelDate} style={styles.small} /></View>
        </View>
        {readError ? <Text text={readError} style={styles.error} /> : null}
        <GlassSurface green contentStyle={styles.hero}>
          <Text text="本周状态回顾" style={styles.heroTitle} />
          <Text testID="weekly-reflection-summary" text={generating ? "正在为你整理这周的心情…" :
            (reflection?.summary ? reflection.summary.trim().split(/\n+/).filter(Boolean).map(paragraph => "　　" + paragraph.trim()).join("\n") : "") || (loading ? "正在读取这一周的记录…" : moodCount || snapshot?.survey ?
            "这一周的记录已经准备好了。愿意的话，可以一起回顾。" : "没有足够的自述记录也没关系，从今天开始就好。")}
            style={[styles.heroText, (!reflection?.summary || generating) && styles.heroPlaceholder]} selectable />
          {reflection?.score != null && (
            <View style={styles.scoreBox}>
              <Pressable onPress={() => setShowScore(value => !value)} style={styles.scoreToggle}
                accessibilityRole="button" testID="weekly-score-toggle">
                <Feather name={showScore ? "eye-off" : "eye"} size={15} color="#e8f4e3" />
                <Text text={showScore ? "隐藏参考值" : "查看 AI 感受参考值（可选）"} style={styles.heroSmall} />
              </Pressable>
              {showScore && <><Text text={String(reflection.score) + " / 100"} style={styles.score} />
                <Text text="AI 根据自述给出的粗略参考，不代表心理健康、风险或个人能力。" style={styles.heroSmall} /></>}
            </View>
          )}
          <Pressable disabled={!canGenerate} testID="weekly-generate" onPress={confirmGenerate}
            style={[styles.heroButton, !canGenerate && styles.disabled]} accessibilityRole="button">
            {generating ? <ActivityIndicator size="small" color={C.primary} /> : <Feather name="refresh-cw" color={C.primary} size={16} />}
            <Text text={generating ? "生成中…" : reflection ? "重新生成回顾" : "生成 AI 回顾"} style={styles.buttonLabel} />
          </Pressable>
          <Text text="不设扣分或排名 · 仅供自我回顾" style={styles.heroSmall} />
        </GlassSurface>
        {aiError ? <Text text={aiError} style={styles.error} /> : null}
        <View style={[styles.metrics, largeText && styles.stack]}>
          {[
            { label: "心情记录", value: snapshot ? String(moodCount) + " / 7" : "—", icon: "heart" as const },
            { label: "本周新求助", value: support ? String(support.submitted) : "—", icon: "message-circle" as const },
            { label: "夜间采样时段", value: snapshot?.activityAvailable ? String(nightCount) : "—", icon: "moon" as const },
          ].map(item => <GlassSurface key={item.label} style={styles.metric} contentStyle={styles.metricContent}>
            <Feather name={item.icon} size={20} color={C.primary} />
            <Text text={item.value} style={styles.metricValue} /><Text text={item.label} style={styles.small} />
          </GlassSurface>)}
        </View>
        <View style={desktop && styles.desktopGrid}>
          <View style={desktop && styles.column}>
            <GlassSurface style={styles.section} contentStyle={styles.panel}>
              <Text text="七日心情" style={styles.cardTitle} />
              <View style={[styles.days, largeText && styles.stack]}>
                {days.map((day, i) => {
                  const mood = snapshot?.moods.find(record => record.recordDate === day)?.mood
                  return <View key={day} style={[styles.day, i === 6 && styles.currentDay]}>
                    <Text text={i === 6 ? "今天" : formatDay(day)} style={styles.small} />
                    <View style={[styles.dot, mood && styles.moodDot]} />
                    <Text text={mood ? moodLabels[mood] : "未记录"} style={styles.dayMood} />
                  </View>
                })}
              </View>
            </GlassSurface>
            <GlassSurface style={styles.section} contentStyle={styles.panel}>
              <Text text="求助与支持" style={styles.cardTitle} />
              {support ? <Text text={"本周新发出 " + support.submitted + " 次请求；本周相关请求中，等待回复 " + support.awaiting +
                " 件、已有跟进 " + support.followed_up + " 件、已完成 " + support.completed + " 件。"} style={styles.body} /> :
                <Text text="暂时无法读取求助进度，不将未知信息当作没有求助。" style={styles.body} />}
            </GlassSurface>
          </View>
          <View style={desktop && styles.column}>
            <GlassSurface style={styles.section} contentStyle={styles.panel}>
              <Text text="夜间记录 · 由你解释" style={styles.cardTitle} />
              {nightCount > 0 && <Text text="夜间定位采样，不代表熬夜或出行；可自行说明或排除。" style={styles.body} />}
              <Text text={!snapshot?.activityAvailable ? "本机活动记录暂不可用。" : !nightCount ? "本周没有夜间记录。" :
                "已有 " + explainedCount + " / " + nightCount + " 个时段说明。"} style={styles.hint} />
              {periods?.map(period => {
                const saved = snapshot?.notes[period.key]
                return <View key={period.key} style={styles.period}>
                  <Pressable testID={"weekly-night-" + period.key} onPress={() => startEdit(period)}
                    style={styles.periodRow} accessibilityRole="button">
                    <View style={{ flex: 1 }}><Text text={periodLabel(period)} style={styles.periodLabel} />
                      <Text text={saved ? (nightOptions.find(([value]) => value === saved.kind)?.[1] || "已说明") : "无需解释，也可以补充"} style={[styles.small, { textAlign: "left" }]} />
                      {saved?.note ? <Text text={saved.note} style={styles.hint} /> : null}</View>
                    <Text text={saved ? "编辑" : "添加说明"} style={styles.link} />
                  </Pressable>
                  {editing?.key === period.key && <View style={styles.editor}>
                    <View style={styles.options}>
                      {nightOptions.map(([value, title]) => <Pressable key={value} testID={"night-kind-" + value}
                        onPress={() => setKind(value)} style={[styles.option, kind === value && styles.optionSelected]}
                        accessibilityRole="radio" accessibilityState={{ checked: kind === value }}>
                        <Text text={title} style={[styles.small, kind === value && styles.selectedText]} />
                      </Pressable>)}
                    </View>
                    <TextInput testID="night-note-input" accessibilityLabel="夜间记录备注" placeholder="补充说明（可选，仅本机保存）"
                      value={note} onChangeText={setNote} maxLength={300} multiline style={styles.input} placeholderTextColor={C.secondary} />
                    <View style={styles.actions}>
                      <Pressable onPress={() => setEditing(null)} style={styles.outlineButton}><Text text="取消" style={styles.link} /></Pressable>
                      <Pressable onPress={submitNote} testID="night-note-save" style={styles.primaryButton}><Text text="保存说明" style={styles.primaryLabel} /></Pressable>
                    </View>
                  </View>}
                </View>
              })}
              {nightCount > 3 && <Pressable style={styles.outlineButton} onPress={() => setExpanded(value => !value)}>
                <Text text={expanded ? "收起" : "查看全部时段"} style={styles.link} />
              </Pressable>}
            </GlassSurface>
            <GlassSurface style={styles.section} contentStyle={styles.panel}>
              <Text text="七日活动采样" style={styles.cardTitle} />
              <View style={styles.chart}>
                {activities.map((count, i) => <View key={days[i]} style={styles.chartDay}>
                  <Text text={snapshot?.activityAvailable ? String(count) : "—"} style={styles.small} />
                  <View style={[styles.bar, { height: Math.max(3, count / maxActivity * 65) }]} />
                  <Text text={i === 6 ? "今天" : formatDay(days[i])} style={styles.small} />
                </View>)}
              </View>
            </GlassSurface>
          </View>
        </View>
        <Pressable disabled={loading} onPress={() => void refresh()} style={styles.outlineButton} testID="weekly-refresh">
          <Text text={loading ? "正在读取…" : "刷新记录"} style={styles.link} />
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: C.background },
  scroll: { flex: 1, minHeight: 0 },
  content: { paddingHorizontal: 22, paddingBottom: 38 },
  desktopContent: { ...studentFrame, paddingHorizontal: 36 },
  desktopGrid: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  column: { flex: 1, minWidth: 0 },
  background: { height: "100%", width: "100%", opacity: 0.8 },
  header: { alignItems: "center", marginBottom: 22, gap: 8 },
  headerTitle: { color: C.text, fontSize: 29, lineHeight: 41, fontWeight: "700", textAlign: "center" },
  centerHint: { color: C.secondary, fontSize: 13, lineHeight: 21, textAlign: "center" },
  dateTag: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: "rgba(255,255,255,0.6)" },
  hero: { paddingHorizontal: 22, paddingVertical: 23, alignItems: "center", gap: 13 },
  heroTitle: { color: "#f8faef", fontWeight: "700", fontSize: 20, lineHeight: 29, textAlign: "center" },
  heroText: { color: "#f8faef", fontSize: 15, lineHeight: 25, textAlign: "left", alignSelf: "stretch" },
  heroPlaceholder: { textAlign: "center" },
  heroSmall: { color: "#e9f2e0", fontSize: 12, lineHeight: 20, textAlign: "center" },
  heroButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#f7f9ec", minHeight: 44, borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10 },
  buttonLabel: { color: C.primary, fontSize: 14, fontWeight: "600" },
  disabled: { opacity: 0.55 },
  scoreBox: { alignSelf: "stretch", alignItems: "center", borderTopWidth: 1, borderColor: "rgba(255,255,255,0.24)", paddingTop: 11, gap: 8 },
  scoreToggle: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, justifyContent: "center" },
  score: { color: "#f8faef", fontSize: 31, lineHeight: 41, fontWeight: "600", textAlign: "center" },
  metrics: { flexDirection: "row", gap: 10, marginVertical: 18 },
  stack: { flexDirection: "column" },
  metric: { flex: 1, minWidth: 0 },
  metricContent: { paddingVertical: 17, paddingHorizontal: 7, alignItems: "center", gap: 7 },
  metricValue: { color: C.text, fontSize: 23, lineHeight: 31, fontWeight: "500", textAlign: "center" },
  small: { color: C.secondary, fontSize: 12, lineHeight: 19, textAlign: "center" },
  section: { marginBottom: 16 },
  panel: { padding: 17, gap: 11 },
  cardTitle: { fontSize: 19, lineHeight: 28, fontWeight: "700", color: C.text, textAlign: "center" },
  body: { fontSize: 14, lineHeight: 23, color: C.text },
  hint: { color: C.secondary, fontSize: 12, lineHeight: 20 },
  days: { flexDirection: "row", gap: 3 },
  day: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 9, borderRadius: 13 },
  currentDay: { backgroundColor: ui.tint },
  dot: { width: 9, height: 9, borderRadius: 9, backgroundColor: "rgba(90,115,90,0.17)" },
  moodDot: { backgroundColor: "#83a18a" },
  dayMood: { fontSize: 11, lineHeight: 18, color: C.text, textAlign: "center" },
  period: { borderTopWidth: 1, borderColor: ui.line, paddingTop: 9 },
  periodRow: { minHeight: 46, flexDirection: "row", alignItems: "center", gap: 12 },
  periodLabel: { textAlign: "left", fontWeight: "600", fontSize: 14, lineHeight: 21, color: C.text },
  editor: { backgroundColor: ui.wash, borderRadius: 15, padding: 12, marginTop: 9, gap: 10 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  option: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, backgroundColor: ui.surface, borderWidth: 1, borderColor: ui.line },
  optionSelected: { backgroundColor: ui.primary, borderColor: ui.primary },
  selectedText: { color: ui.surface },
  input: { fontSize: 14, lineHeight: 22, textAlignVertical: "top", backgroundColor: ui.surface, color: ui.ink, borderColor: ui.line, borderWidth: 1, borderRadius: 12, padding: 10, minHeight: 75 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 },
  outlineButton: { alignSelf: "center", alignItems: "center", justifyContent: "center", minHeight: 40, paddingHorizontal: 15, borderRadius: 22, borderWidth: 1, borderColor: ui.line },
  link: { color: C.primary, fontSize: 13, fontWeight: "600", lineHeight: 21 },
  primaryButton: { minHeight: 40, paddingHorizontal: 17, justifyContent: "center", alignItems: "center", borderRadius: 22, backgroundColor: ui.primary },
  primaryLabel: { color: ui.surface, fontSize: 13, fontWeight: "600" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 4, marginVertical: 6 },
  chartDay: { alignItems: "center", justifyContent: "flex-end", flex: 1, minWidth: 0, gap: 5 },
  bar: { width: 14, backgroundColor: "#93ad92", borderRadius: 9 },
  error: { fontSize: 13, lineHeight: 21, color: C.danger, textAlign: "center", marginVertical: 10 },
  footer: { color: C.secondary, fontSize: 12, lineHeight: 20, textAlign: "center", marginTop: 13 },
})
