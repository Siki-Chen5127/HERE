import { useCallback, useEffect, useRef, useState } from "react"
import { Pressable, StyleSheet, Switch, TextInput, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

import { feedback, Alert } from "@/components/Feedback"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { SupportProgress, supportTime } from "@/components/SupportProgress"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"
import { useAuth } from "@/context/AuthContext"
import { createClientEventId } from "@/services/alertSync"
import { getHereApiErrorMessage, mobileApi, type SupportRequest } from "@/services/hereApi"
import { load, save } from "@/utils/storage"

import { homeColors as C } from "./MainScreen/components/homeAppearance"
import { SoftPressable } from "./MainScreen/components/SoftPressable"

const week = 7 * 86400000
const emptySurvey = { rest: "", stress: "", support: "", lastSaved: 0, reminder: false }

export function SupportScreen({ navigation, route }: {
  navigation: { goBack(): void }
  route: { params?: { section?: "request" | "progress" | "wellbeing" } }
}) {
  const { currentUser } = useAuth()
  const { width, fontScale } = useViewport()
  const desktop = width >= 980 && fontScale < 1.3
  const key = `wellbeing:${currentUser?.id ?? 'local'}`
  const [section, setSection] = useState(route.params?.section ?? "request")
  const [message, setMessage] = useState("")
  const [consent, setConsent] = useState(false)
  const [sending, setSending] = useState(false)
  const [orders, setOrders] = useState<SupportRequest[] | null>(null)
  const [progressError, setProgressError] = useState("")
  const [survey, setSurvey] = useState(() => load<typeof emptySurvey>(key) || emptySurvey)
  const [remaining, setRemaining] = useState<number | null>(null)
  const requestId = useRef<string | null>(null)
  const restDeadline = useRef(0)
  const progressLoad = useRef(0)
  const fetchProgress = useCallback(async () => {
    const token = ++progressLoad.current
    setProgressError("")
    try {
      const result = await mobileApi.getSupportRequests()
      if (token === progressLoad.current) setOrders(result)
    } catch (error) {
      if (token === progressLoad.current) setProgressError(getHereApiErrorMessage(error))
    }
  }, [])

  useFocusEffect(useCallback(() => {
    if (section !== "progress") return
    void fetchProgress()
    return () => { progressLoad.current++ }
  }, [fetchProgress, section]))

  const timerRunning = section === "wellbeing" && remaining !== null && remaining > 0
  useEffect(() => {
    if (!timerRunning) return
    const timer = setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((restDeadline.current - Date.now()) / 1000)))
    }, 250)
    return () => clearInterval(timer)
  }, [timerRunning])

  const send = async () => {
    const content = message.trim()
    if (!content || !consent || sending) return
    setSending(true)
    requestId.current ||= createClientEventId("student-support")
    try {
      await mobileApi.createAlert({ client_event_id: requestId.current, category: "student_support",
        severity: "low", description: content })
      setMessage("")
      setConsent(false)
      requestId.current = null
      setSection("progress")
      feedback.success("关怀请求已提交")
    } catch (error) {
      feedback.error("提交失败", getHereApiErrorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const storeSurvey = (next: typeof survey, title: string) => {
    if (!save(key, next)) {
      feedback.error("保存失败", "请检查本地存储。")
      return
    }
    setSurvey(next)
    feedback.success(title)
  }

  const action = (label: string, run: () => void, disabled = false) => (
    <SoftPressable onPress={run} disabled={disabled} accessibilityRole="button" accessibilityState={{ disabled }}
      style={[styles.actionWrap, disabled && styles.disabled]}>
      <View style={styles.action}><Text text={label} style={styles.actionLabel} /></View>
    </SoftPressable>
  )

  return (
    <Screen preset="scroll" safeAreaEdges={["top", "bottom"]} backgroundColor={ui.canvas}
      contentContainerStyle={[styles.content, desktop && styles.wideContent]}>
      <Pressable onPress={navigation.goBack} accessibilityRole="button" style={styles.back}>
        <Text text="‹ 返回" style={styles.backText} />
      </Pressable>
      <Text text="校园关怀" style={styles.title} />
      <View style={styles.tabs}>
        {([["request", "联系辅导员"], ["progress", "我的求助"], ["wellbeing", "近况与休息"]] as const).map(([value, label]) => (
          <SoftPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: section === value }}
            onPress={() => setSection(value)} style={[styles.tab, section === value && styles.activeTab]}>
            <Text text={label} style={styles.tabText} />
          </SoftPressable>
        ))}
      </View>

      {section === "request" && (
        <View style={desktop && styles.split}>
          <View style={desktop && styles.primary}>
          <Text text="告诉辅导员你希望获得什么支持。" style={styles.description} />
          <Text text="你愿意分享的内容" style={styles.label} />
          <TextInput accessibilityLabel="你愿意分享的内容" value={message} onChangeText={value => { setMessage(value); requestId.current = null }}
            multiline maxLength={1200} editable={!sending} style={[styles.input, styles.textArea]} />
          <View style={styles.switchRow}>
            <View style={styles.switchText}><Text text="我同意将以上内容发送给辅导员" style={styles.label} /></View>
            <Switch accessibilityLabel="同意将以上内容发送给辅导员" value={consent} onValueChange={setConsent} disabled={sending} />
          </View>
          {action(sending ? "正在提交…" : "提交关怀请求", () => void send(), sending || !consent || !message.trim())}
          </View>
          <View style={[styles.aside, desktop && styles.asideWide]}>
            <Text text="分享范围" style={styles.sectionTitle} />
            <Text text="辅导员会看到你提交的文字。你的心情记录、近况问卷和 AI 对话不会随这次请求一起发送。" style={styles.description} />
          </View>
        </View>
      )}

      {section === "progress" && (
        <>
          <Text text="这里显示你主动发出的关怀请求和工作人员公开的进度。" style={styles.description} />
          {action("刷新进度", () => void fetchProgress())}
          {progressError ? <Text text={progressError} style={styles.error} /> : !orders
            ? <Text text="正在读取进度…" style={styles.description} />
            : !orders.length ? <Text text="暂时还没有关怀请求。" style={styles.description} />
            : orders.map(order => (
              <View key={order.number} style={[styles.order, styles.requestCard]}>
                <Text text={order.message || "关怀请求"} style={styles.sectionTitle} />
                <Text text={order.number} style={styles.description} />
                <SupportProgress request={order} horizontal={desktop} />
                {order.updates.map((item, index) => (
                  <View key={item.createdAt + index} style={styles.update}>
                    <Text text={item.text} style={styles.label} />
                    <Text text={supportTime(item.createdAt)} style={styles.description} />
                  </View>
                ))}
              </View>
            ))}
        </>
      )}

      {section === "wellbeing" && (
        <View style={desktop && styles.split}>
          <View style={desktop && styles.primary}>
          <Text text="近况问卷" style={styles.sectionTitle} />
          <Text text={survey.reminder && Date.now() - survey.lastSaved >= week
            ? "可以花一点时间回顾这周的近况。"
            : "写下近况，留给自己回看。"} style={styles.description} />
          {([["rest", "这周休息得怎么样？"], ["stress", "最近有什么让你感到压力？"], ["support", "什么支持对你有帮助？"]] as const).map(([field, label]) => (
            <View key={field} style={styles.field}>
              <Text text={label} style={styles.label} />
              <TextInput accessibilityLabel={label} value={survey[field]} maxLength={600}
                onChangeText={text => setSurvey(current => ({ ...current, [field]: text }))}
                multiline style={styles.input} />
            </View>
          ))}
          {action("保存近况", () => {
            if (!survey.rest.trim()) {
              Alert.alert("请先填写", "写下这周的休息情况，再保存问卷。")
              return
            }
            storeSurvey({ ...survey, lastSaved: Date.now() }, "近况已保存")
          })}
          <View style={styles.switchRow}>
            <View style={styles.switchText}><Text text="打开页面时提醒我填写每周问卷" style={styles.label} /></View>
            <Switch accessibilityLabel="每周问卷页面内提醒" value={survey.reminder}
              onValueChange={reminder => {
                const stored = load<typeof emptySurvey>(key) || emptySurvey
                if (save(key, { ...stored, reminder })) {
                  setSurvey(current => ({ ...current, reminder }))
                  feedback.success(reminder ? "已开启每周问卷提醒" : "已关闭每周问卷提醒")
                } else feedback.error("保存失败", "请检查本地存储。")
              }} />
          </View>
          </View>
          <View style={[styles.aside, desktop && styles.asideWide]}>
            <Text text="给自己一分钟" style={styles.sectionTitle} />
            <Text text="把视线从屏幕移开，活动一下肩膀。" style={styles.description} />
            {remaining !== null && <Text text={remaining ? `剩余 ${remaining} 秒` : "这一分钟结束了。"} style={styles.label} />}
            {action("开始一分钟休息", () => { restDeadline.current = Date.now() + 60000; setRemaining(60) }, timerRunning)}
          </View>
        </View>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  wideContent: { ...studentFrame, paddingHorizontal: 36, paddingTop: 31 },
  split: { flexDirection: "row", alignItems: "flex-start", gap: 28 },
  primary: { flex: 1.7, minWidth: 0 },
  aside: { marginTop: 18, backgroundColor: ui.wash, borderRadius: ui.radius.surface, padding: 18 },
  asideWide: { flex: 1, minWidth: 0, marginTop: 0 },
  requestCard: { backgroundColor: ui.surface, borderRadius: ui.radius.surface, borderWidth: 1, borderColor: ui.line, paddingHorizontal: 20 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 22, paddingTop: 18, paddingBottom: 42 },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingRight: 12 },
  backText: { color: C.primary, fontWeight: "700", fontSize: 16 },
  title: { color: C.text, fontSize: 34, lineHeight: 43, fontWeight: "700" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 6, borderBottomWidth: 1, borderColor: C.line, marginVertical: 15, paddingBottom: 8 },
  tab: { borderRadius: 21, paddingVertical: 12, paddingHorizontal: 11 },
  activeTab: { backgroundColor: "#e0e9d8" },
  tabText: { color: C.text, fontWeight: "600", fontSize: 14 },
  description: { color: C.secondary, marginVertical: 8, fontSize: 15, lineHeight: 24 },
  field: { paddingBottom: 8 },
  label: { color: C.text, fontWeight: "600", fontSize: 15 },
  input: { color: C.text, backgroundColor: "#fffdf6", borderColor: "#94a895", borderWidth: 1,
    borderRadius: 10, padding: 10, fontSize: 16, minHeight: 44, marginTop: 7, textAlignVertical: "top" },
  textArea: { minHeight: 110 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, marginVertical: 5 },
  switchText: { flex: 1 },
  actionWrap: { alignSelf: "flex-start", marginVertical: 6, borderRadius: 24, backgroundColor: "#325b44" },
  action: { minHeight: 44, justifyContent: "center", paddingHorizontal: 17 },
  actionLabel: { color: "#fffdf4", fontWeight: "700", fontSize: 15 },
  disabled: { opacity: 0.48 },
  error: { color: C.danger, marginTop: 12 },
  order: { borderTopWidth: 1, borderColor: C.line, paddingVertical: 14, marginTop: 10 },
  update: { borderLeftWidth: 2, borderColor: "#92aa8d", paddingLeft: 12, marginTop: 7 },
  sectionTitle: { color: C.text, fontWeight: "700", fontSize: 20, lineHeight: 29 },
})
