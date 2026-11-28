import React from "react"
import { AppState, StyleSheet, View } from "react-native"
import { useFocusEffect } from "@react-navigation/native"

import { Text } from "@/components/Text"
import { feedback } from "@/components/Feedback"
import {
  getLocalRecordDate,
  moodsRepository,
  type MoodRecord,
  type MoodValue,
} from "@/services/database/repositories/moods"

import { GlassSurface } from "./GlassSurface"
import { SoftPressable } from "./SoftPressable"
import { homeColors as C } from "./homeAppearance"

const OPTIONS: { value: MoodValue; label: string }[] = [
  { value: "good", label: "还不错" },
  { value: "okay", label: "一般" },
  { value: "tired", label: "有点累" },
]

interface DailyMoodProps {
  userId: string | null
  largeText: boolean
  onRecorded?: () => void
}

export function DailyMood({
  userId,
  largeText,
  onRecorded,
}: DailyMoodProps) {
  const [record, setRecord] = React.useState<MoodRecord | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(() => {
    try {
      const today = getLocalRecordDate()

      setRecord(
        userId
          ? moodsRepository.getForDay(userId, today)
          : null,
      )

      setError(null)
    } catch {
      setError("读取失败，点击状态可重新保存")
    }
  }, [userId])

  // 返回首页、切回应用时读取；停留期间也检查跨天。
  useFocusEffect(
    React.useCallback(() => {
      refresh()

      const subscription = AppState.addEventListener(
        "change",
        (state) => {
          if (state === "active") refresh()
        },
      )

      const timer = setInterval(() => {
        if (AppState.currentState === "active") refresh()
      }, 60_000)

      return () => {
        subscription.remove()
        clearInterval(timer)
      }
    }, [refresh]),
  )

  const selectMood = (value: MoodValue) => {
    if (!userId) return

    try {
      // 数据库保存成功后，再更新选中效果。
      const saved = moodsRepository.saveToday(userId, value)
      setRecord(saved)
      setError(null)
      onRecorded?.()
      feedback.success("心情已记录")
    } catch {
      setError("保存未确认，请重新点击尝试")
    }
  }

  const hint = !userId ? "请先登录" : error

  return (
    <GlassSurface
      style={styles.surface}
      contentStyle={styles.content}
    >
      <Text text="今天感觉怎么样？" style={styles.title} />
      <View style={[styles.options, largeText && styles.stack]}>
        {OPTIONS.map((option) => {
          const selected =
            record?.userId === userId &&
            record?.recordDate === getLocalRecordDate() &&
            record?.mood === option.value

          return (
            <SoftPressable
              key={option.value}
              style={styles.optionWrapper}
              onPress={() => selectMood(option.value)}
              disabled={!userId}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{
                checked: selected,
                disabled: !userId,
              }}
            >
              <View
                style={[
                  styles.option,
                  selected && styles.selectedOption,
                ]}
              >
                <Text
                  text={option.label}
                  style={[
                    styles.label,
                    selected && styles.selectedLabel,
                  ]}
                />
              </View>
            </SoftPressable>
          )
        })}
      </View>

      {hint ? (
        <Text
          text={hint}
          accessibilityLiveRegion="polite"
          style={[styles.hint, !!error && styles.error]}
        />
      ) : null}
    </GlassSurface>
  )
}

const styles = StyleSheet.create({
  surface: {
    marginBottom: 20,
  },
  content: {
    paddingHorizontal: 3,
    paddingTop: 18,
    paddingBottom: 12,
  },
  options: {
    flexDirection: "row",
    gap: 8,
  },
  stack: {
    flexDirection: "column",
  },
  optionWrapper: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
   option: {
    minHeight: 48,
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

   selectedOption: {
    backgroundColor: "#426b52",
    borderColor: "rgba(255,255,255,0.75)",
  },
  title: { color: C.text, fontSize: 17, fontWeight: "600", marginBottom: 9, textAlign: "center" },
  label: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500",
    color: C.secondary,
  },
  selectedLabel: {
    color: "#FFFFFF",
  },
  hint: {
    fontSize: 11,
    lineHeight: 18,
    textAlign: "center",
    color: C.secondary,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  error: {
    color: C.danger,
  },
})
