import { useCallback, useState } from "react"
import { Platform, StyleSheet, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

import { Text } from "@/components/Text"
import { SupportProgress } from "@/components/SupportProgress"
import { studentUi as ui } from "@/theme/studentUi"
import { getLocalRecordDate, moodsRepository, type MoodRecord } from "@/services/database/repositories/moods"
import { mobileApi, type SupportRequest } from "@/services/hereApi"

import { HomeIcon } from "./HomeIcon"
import { SoftPressable } from "./SoftPressable"

const moodLabels = { good: "还不错", okay: "一般", tired: "有点累" }
function daysOfWeek() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - 6 + index)
    return { key: getLocalRecordDate(date), label: index === 6 ? "今天" : ["日", "一", "二", "三", "四", "五", "六"][date.getDay()] }
  })
}

export function HomeActivity({ userId, revision, onProgress }: {
  userId: string | null
  revision: number
  onProgress(): void
}) {
  const [records, setRecords] = useState<MoodRecord[] | null>(null)
  const [requests, setRequests] = useState<SupportRequest[] | null>(null)
  const [requestError, setRequestError] = useState(false)
  const days = daysOfWeek()
  const firstDate = days[0].key

  useFocusEffect(useCallback(() => {
    try {
      setRecords(userId ? moodsRepository.listSince(userId, firstDate) : [])
    } catch {
      setRecords(null)
    }
  }, [firstDate, revision, userId]))

  useFocusEffect(useCallback(() => {
    if (!userId) return
    let active = true
    let revision = 0
    const refresh = () => {
      const request = ++revision
      setRequestError(false)
      mobileApi.getSupportRequests().then(result => {
        if (active && request === revision) setRequests(result)
      }).catch(() => {
        if (active && request === revision) setRequestError(true)
      })
    }
    refresh()
    if (Platform.OS === "web") window.addEventListener("focus", refresh)
    return () => {
      active = false
      if (Platform.OS === "web") window.removeEventListener("focus", refresh)
    }
  }, [userId]))

  return (
    <View style={styles.activity}>
      <View style={styles.moodPanel}>
        <View style={styles.heading}>
          <Text text="这一周的心情" style={styles.title} />
          {records && <Text text={`记录了 ${days.filter(day => records.some(record => record.recordDate === day.key)).length} 天`} style={styles.subdued} />}
        </View>
        {records ? <View style={styles.days}>{days.map(day => {
          const mood = records.find(record => record.recordDate === day.key)?.mood
          return <View key={day.key} style={styles.day}>
            <Text text={day.label} style={styles.subdued} />
            <View style={[styles.dot, mood && styles[mood]]} />
            <Text text={mood ? moodLabels[mood] : "—"} style={styles.dayText} />
          </View>
        })}</View> : <Text text="暂时无法读取心情记录。" style={styles.subdued} />}
      </View>
      <View style={styles.requestsPanel}>
        <View style={styles.heading}><Text text="求助动态" style={styles.title} /></View>
        {requestError ? <Text text="暂时无法读取进度。" style={styles.subdued} /> :
          requests?.length ? requests.slice(0, 1).map(request => (
            <View key={request.number} style={styles.request}>
              <Text text={request.message || "关怀请求"} numberOfLines={2} style={styles.preview} />
              <SupportProgress request={request} horizontal />
            </View>
          )) : <Text text={requests ? "你还没有提交关怀请求。" : "正在读取进度…"} style={styles.subdued} />}
        <SoftPressable onPress={onProgress} accessibilityRole="button" accessibilityLabel="查看全部求助进度">
          <View style={styles.more}>
            <Text text="查看全部求助进度" style={styles.moreText} />
            <HomeIcon icon="caretRight" size={17} color="#3a614a" />
          </View>
        </SoftPressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  activity: { flexDirection: "row", gap: 34, borderTopWidth: 1, borderBottomWidth: 1, borderColor: ui.line,
    marginTop: 12, marginBottom: 4, paddingVertical: 23, minHeight: 205, flexGrow: 1 },
  moodPanel: { flex: 1.45, minWidth: 0 },
  requestsPanel: { flex: 1, minWidth: 0, borderLeftWidth: 1, borderColor: "#cfdac8", paddingLeft: 24 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 9, marginBottom: 15 },
  title: { color: "#293f32", fontSize: 19, fontWeight: "700" },
  subdued: { color: "#526958", fontSize: 13, lineHeight: 21 },
  days: { flexDirection: "row", justifyContent: "space-between" },
  day: { flex: 1, alignItems: "center", paddingVertical: 10, borderRightWidth: 1, borderColor: "#dae2d1", gap: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: "#91a58e" },
  good: { backgroundColor: "#74a080", borderColor: "#74a080" },
  okay: { backgroundColor: "#d7b678", borderColor: "#ab8a52" },
  tired: { backgroundColor: "#bcb2c9", borderColor: "#9e90a8" },
  dayText: { color: "#435c4d", fontSize: 12, lineHeight: 20 },
  request: { gap: 4,
    borderBottomWidth: 1, borderColor: "#d6dfce", paddingVertical: 7 },
  preview: { color: "#314b3b", fontSize: 14, lineHeight: 22 },
  more: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44 },
  moreText: { color: "#3a614a", fontWeight: "700", fontSize: 14 },
})
