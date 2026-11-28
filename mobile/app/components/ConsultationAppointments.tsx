import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"
import Feather from "@expo/vector-icons/Feather"
import { Alert, feedback } from "@/components/Feedback"
import { Text } from "@/components/Text"
import { mobileApi, getHereApiErrorMessage, type Consultation, type ConsultationAvailability } from "@/services/hereApi"
import { studentUi as ui } from "@/theme/studentUi"

const labels: Record<string, string> = {
  assigned: "待选择时间", appointment_requested: "等待咨询师确认", scheduled: "预约已确认",
  active: "咨询进行中", completed: "已结案", cancelled: "已取消",
}
const hours = [9, 10, 11, 14, 15, 16]
function displayTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "时间待确认" : date.toLocaleString("zh-CN", {
    month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Asia/Shanghai",
  })
}

export function ConsultationAppointments() {
  const [cases, setCases] = useState<Consultation[] | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<{ id?: string; psychologist?: string } | null>(null)
  const [dayIndex, setDayIndex] = useState(0)
  const [hour, setHour] = useState<number | null>(null)
  const [consent, setConsent] = useState(false)
  const request = useRef(0)
  const availabilityRequest = useRef(0)
  const [availability, setAvailability] = useState<ConsultationAvailability | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState("")
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    // Dates represent campus time (China Standard Time), not the device's time zone.
    const day = new Date(Date.now() + 8 * 3600000)
    day.setUTCHours(0, 0, 0, 0)
    day.setUTCDate(day.getUTCDate() + index + 1)
    return day
  }), [form])
  const dayKey = dates[dayIndex]?.toISOString().slice(0, 10) || ""
  const currentAvailability = availability?.day === dayKey ? availability.slots : []
  const selectedSlot = currentAvailability.find(slot => slot.hour === hour && slot.available)
  const loadAvailability = useCallback(async (showLoading = false) => {
    if (!form || !dayKey) return
    const sequence = ++availabilityRequest.current
    if (showLoading) setAvailabilityLoading(true)
    try {
      const data = await mobileApi.getConsultationAvailability(dayKey, form.id)
      if (availabilityRequest.current !== sequence) return
      setAvailability(data)
      setAvailabilityError("")
      setHour(current => data.slots.some(slot => slot.hour === current && slot.available) ? current : null)
    } catch (err) {
      if (availabilityRequest.current !== sequence) return
      setAvailability(null)
      setHour(null)
      setAvailabilityError(getHereApiErrorMessage(err, "暂时无法读取可预约时段"))
    } finally {
      if (availabilityRequest.current === sequence) setAvailabilityLoading(false)
    }
  }, [dayKey, form])
  useEffect(() => {
    setAvailability(null)
    setAvailabilityError("")
    if (!form) return
    void loadAvailability(true)
    const timer = setInterval(() => void loadAvailability(), 8000)
    return () => { clearInterval(timer); availabilityRequest.current++ }
  }, [form, loadAvailability])

  const load = useCallback(async () => {
    const sequence = ++request.current
    try {
      const result = await mobileApi.getConsultations()
      if (sequence === request.current) { setCases(result); setError("") }
    } catch (err) {
      if (sequence === request.current) setError(getHereApiErrorMessage(err, "暂时无法读取预约"))
    }
  }, [])
  useFocusEffect(useCallback(() => {
    void load()
    const timer = setInterval(() => void load(), 20000)
    return () => { clearInterval(timer); request.current++ }
  }, [load]))
  const open = (item?: Consultation) => {
    setForm({ id: item?.id, psychologist: item?.psychologist })
    setAvailability(null); setDayIndex(0); setHour(null); setConsent(false)
  }
  const submit = async () => {
    if (!form || !selectedSlot || !consent || busy || availabilityLoading) return
    setBusy(true)
    try {
      await mobileApi.requestAppointment(selectedSlot.startsAt, form.id)
      setForm(null)
      await load()
      feedback.success("预约意向已提交", "咨询师确认后，可在这里查看正式预约时间。")
    } catch (err) { feedback.error("预约提交失败", getHereApiErrorMessage(err)); await Promise.all([load(), loadAvailability(true)]) }
    finally { setBusy(false) }
  }
  const cancel = (item: Consultation) => Alert.alert("取消预约", "取消的是这个时间安排；原有的转介个案不会被删除。", [
    { text: "返回", style: "cancel" },
    { text: "确认取消", onPress: async () => {
      setBusy(true)
      try { await mobileApi.cancelAppointment(item.id); await load(); feedback.success("已取消预约") }
      catch (err) { feedback.error("取消失败", getHereApiErrorMessage(err)); await load() }
      finally { setBusy(false) }
    } },
  ])
  const active = cases?.some(item => ["assigned", "appointment_requested", "scheduled", "active"].includes(item.status))
  return (
    <View style={styles.container}>
      <Text text="预约心理咨询" style={styles.title} />
      <Text text="如果你愿意，可以为自己约一次面对面的专业交流。先提交时间意向，待咨询师确认。" style={styles.copy} />
      <View style={styles.actions}>
        <Pressable testID="consultation-refresh" onPress={() => { void load(); if (form) void loadAvailability(true) }} style={styles.outline}><Feather name="refresh-cw" size={15} color={ui.primary} /><Text text="刷新预约" style={styles.link} /></Pressable>
        {cases && !active && !form && <Pressable testID="consultation-new" onPress={() => open()} style={styles.primary}><Feather name="calendar" size={16} color={ui.surface} /><Text text="申请预约" style={styles.primaryText} /></Pressable>}
      </View>
      {error ? <Text text={error} style={styles.error} /> : !cases ? <Text text="正在读取预约…" style={styles.copy} /> :
        !cases.length && <Text text="还没有预约。你可以从一次自愿交流开始。" style={styles.copy} />}
      {cases?.map(item => <View key={item.id} style={styles.card} testID={"consultation-card-" + item.id}>
        <View style={styles.row}><Text text={item.psychologist + " · 咨询师"} style={styles.name} /><Text text={labels[item.status] || item.status} style={styles.badge} /></View>
        <Text text={item.referred ? "辅导员转介" : "自主预约"} style={styles.copy} />
        {item.scheduledAt && item.status !== "cancelled" && <Text text={(item.status === "appointment_requested" ? "意向时间：" : "预约时间：") + displayTime(item.scheduledAt)} style={styles.time} />}
        {item.status === "assigned" && <Text text="可选择合适的时间，提交给咨询师确认。" style={styles.copy} />}
        {item.status === "assigned" && <Pressable disabled={busy} testID={"consultation-choose-" + item.id}
          onPress={() => open(item)} style={styles.primary}><Text text="选择预约时间" style={styles.primaryText} /></Pressable>}
        {(["appointment_requested", "scheduled"].includes(item.status) || (item.status === "assigned" && !item.referred)) && <Pressable disabled={busy} onPress={() => cancel(item)} style={styles.outline}>
          <Text text="取消预约" style={styles.link} /></Pressable>}
      </View>)}
      {form && <View style={styles.card} testID="consultation-form">
        <Text text={form.psychologist ? "与 " + form.psychologist + " 约时间" : "选择方便的时间"} style={styles.name} />
        <Text text="已被预约的时段不可选择（北京时间），提交后等待咨询师确认。" style={styles.copy} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
          {dates.map((day, index) => <Pressable key={index} testID={"consultation-date-" + index}
            onPress={() => { if (dayIndex !== index) { setHour(null); setAvailability(null); setDayIndex(index) } }} style={[styles.day, dayIndex === index && styles.chosen]}
            accessibilityRole="radio" accessibilityState={{ checked: dayIndex === index }}>
            <Text text={index === 0 ? "明天" : day.toLocaleDateString("zh-CN", { weekday: "short", timeZone: "UTC" })} style={[styles.copy, dayIndex === index && styles.white]} />
            <Text text={String(day.getUTCMonth()+1) + "." + day.getUTCDate()} style={[styles.name, dayIndex === index && styles.white]} />
          </Pressable>)}
        </ScrollView>
        <View style={styles.slots}>{hours.map(value => {
          const slot = currentAvailability.find(item => item.hour === value)
          const disabled = busy || availabilityLoading || !slot?.available
          const status = slot?.state === "occupied" ? "已约满" : slot?.state === "past" ? "已结束" :
            slot?.state === "unavailable" ? "暂无名额" : !slot ? "查询中" : ""
          return <Pressable key={value} disabled={disabled} testID={"consultation-hour-" + value}
            onPress={() => setHour(value)} style={[styles.slot, hour === value && slot?.available && styles.chosen, disabled && styles.slotUnavailable]}
            accessibilityRole="radio" accessibilityLabel={String(value).padStart(2, "0") + ":00 " + status}
            accessibilityState={{ checked: hour === value && !!slot?.available, disabled }}>
            <Text text={String(value).padStart(2,"0") + ":00"} style={[styles.name, hour === value && slot?.available && styles.white, disabled && styles.slotMuted]} />
            {!!status && <Text text={status} style={styles.slotStatus} />}
          </Pressable>
        })}</View>
        {availabilityError ? <View style={styles.actions}>
          <Text text={availabilityError} style={styles.error} />
          <Pressable onPress={() => void loadAvailability(true)} style={styles.outline}><Text text="重新查询" style={styles.link} /></Pressable>
        </View> : null}
        <View style={styles.row}>
          <Text text="我同意向负责咨询师及有权查看个案的督导人员分享姓名、联系方式、学籍基本信息和预约时间。不自动共享日记、心情、AI 对话或问卷。" style={[styles.copy, { flex: 1 }]} />
          <Switch accessibilityLabel="同意预约信息分享" testID="consultation-consent" value={consent} onValueChange={setConsent} disabled={busy} />
        </View>
        <View style={styles.actions}>
          <Pressable disabled={busy} onPress={() => setForm(null)} style={styles.outline}><Text text="取消选择" style={styles.link} /></Pressable>
          <Pressable disabled={busy || !consent || !selectedSlot || availabilityLoading} testID="consultation-submit"
            onPress={() => void submit()} style={[styles.primary, (busy || !consent || !selectedSlot || availabilityLoading) && styles.disabled]}>
            <Text text={busy ? "正在提交…" : "提交预约意向"} style={styles.primaryText} /></Pressable>
        </View>
      </View>}
      <Text text="预约不适用于紧急情况。如有现实危险，请立即寻求身边可信任人员或本地紧急救助。" style={styles.footer} />
    </View>
  )
}
const styles = StyleSheet.create({
  container: { gap: 14, width: "100%", maxWidth: 720, alignSelf: "center" },
  title: { color: ui.ink, fontSize: 24, lineHeight: 33, fontWeight: "700", textAlign: "center" },
  copy: { color: ui.muted, fontSize: 14, lineHeight: 22 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primary: { alignSelf: "flex-start", backgroundColor: ui.primary, borderRadius: 24, paddingHorizontal: 16, minHeight: 44, paddingVertical: 10, justifyContent: "center", flexDirection: "row", alignItems: "center", gap: 7 },
  primaryText: { color: ui.surface, fontSize: 14, fontWeight: "600" },
  outline: { minHeight: 44, alignSelf: "flex-start", borderRadius: 24, borderWidth: 1, borderColor: ui.line, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  link: { color: ui.primary, fontSize: 14, fontWeight: "600" },
  card: { backgroundColor: ui.surface, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: ui.line, gap: 10 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  name: { fontSize: 16, color: ui.ink, fontWeight: "600", lineHeight: 24, flexShrink: 1 },
  badge: { color: ui.primary, backgroundColor: ui.wash, fontSize: 12, lineHeight: 20, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  time: { color: ui.ink, fontWeight: "600", fontSize: 15, lineHeight: 23 },
  dates: { gap: 8, paddingVertical: 5 },
  day: { width: 65, borderWidth: 1, borderColor: ui.line, borderRadius: 14, paddingVertical: 10, alignItems: "center" },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  slot: { borderColor: ui.line, borderWidth: 1, borderRadius: 19, minWidth: 72, minHeight: 40, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  slotUnavailable: { backgroundColor: ui.wash, borderColor: ui.line, opacity: 0.62, paddingVertical: 5 },
  slotMuted: { color: ui.muted },
  slotStatus: { color: ui.muted, fontSize: 10, lineHeight: 14 },
  chosen: { backgroundColor: ui.primary, borderColor: ui.primary },
  white: { color: ui.surface },
  disabled: { opacity: 0.45 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 21 },
  footer: { color: ui.muted, fontSize: 12, lineHeight: 20, textAlign: "center", marginTop: 5 },
})
