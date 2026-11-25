import { StyleSheet, View } from "react-native"

import { Text } from "@/components/Text"
import type { SupportRequest } from "@/services/hereApi"
import { studentUi as ui } from "@/theme/studentUi"

const labels = {
  submitted: "申请已发起",
  assigned: "已分配辅导员",
  received: "教师已接收",
  followedUp: "跟进处理",
  referred: "已转介",
  completed: "处理完成",
} as const

export function supportTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "时间未记录" : new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date)
}

export function SupportProgress({ request, horizontal = false }: { request: SupportRequest; horizontal?: boolean }) {
  const times = request.milestones
  const keys: (keyof typeof labels)[] = ["submitted", "assigned", "received", "followedUp"]
  if (times?.referred) keys.push("referred")
  keys.push("completed")
  const steps = keys.map(key => ({
    key, title: labels[key], stamp: times?.[key] ?? (key === "submitted" ? request.createdAt : null),
  }))
  const next = steps.findIndex(step => !step.stamp)
  return (
    <View style={[styles.track, horizontal && styles.horizontal]} accessibilityLabel="求助处理进度">
      {steps.map((step, index) => {
        const done = Boolean(step.stamp)
        const active = next === index
        const connected = index < steps.length - 1
        return (
          <View key={step.key} style={[styles.step, horizontal && styles.horizontalStep]}>
            <View style={[styles.rail, horizontal && styles.horizontalRail]} accessible={false}>
              {connected && <View style={[
                horizontal ? styles.horizontalLine : styles.verticalLine,
                done && steps[index + 1].stamp && styles.completeLine,
              ]} />}
              <View style={[styles.node, done && styles.completeNode, active && styles.currentNode]}>
                {done && <Text text="✓" style={styles.check} />}
              </View>
            </View>
            <View style={[styles.copy, horizontal && styles.horizontalCopy]}>
              <Text text={step.title} style={[styles.label, !done && !active && styles.dim]} />
              <Text text={step.stamp ? supportTime(step.stamp) : active ? "下一步" : "待完成"} style={styles.time} />
            </View>
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { marginTop: 10 },
  horizontal: { flexDirection: "row" },
  step: { flexDirection: "row", minHeight: 50 },
  horizontalStep: { flexDirection: "column", flex: 1, minWidth: 0 },
  rail: { width: 25, position: "relative" },
  horizontalRail: { width: "100%", height: 24 },
  verticalLine: { position: "absolute", width: 1, left: 8, top: 10, bottom: -2, backgroundColor: ui.line },
  horizontalLine: { position: "absolute", left: 9, right: -9, top: 9, height: 1, backgroundColor: ui.line },
  completeLine: { backgroundColor: ui.primary },
  node: { borderRadius: 9, borderWidth: 1, borderColor: "#87a28b", width: 18, height: 18,
    alignItems: "center", justifyContent: "center", backgroundColor: ui.surface },
  currentNode: { borderWidth: 2, borderColor: ui.primary, backgroundColor: ui.tint },
  completeNode: { backgroundColor: ui.primary, borderColor: ui.primary },
  check: { color: ui.surface, fontSize: 11, lineHeight: 14, fontWeight: "700" },
  copy: { minWidth: 0, flex: 1, paddingBottom: 10 },
  horizontalCopy: { paddingRight: 6 },
  label: { color: ui.ink, fontWeight: "600", fontSize: 13, lineHeight: 20 },
  dim: { color: ui.muted },
  time: { color: ui.muted, fontSize: 12, lineHeight: 18 },
})
