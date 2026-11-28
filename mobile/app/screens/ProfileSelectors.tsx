import { useState } from "react"
import { Modal, Pressable, ScrollView, StyleSheet, View, ViewStyle, StyleProp } from "react-native"
import Feather from "@expo/vector-icons/Feather"

import { Text } from "@/components/Text"
import { studentUi as ui } from "@/theme/studentUi"
import { birthdayAge, daysInMonth, formatBirthday, parseBirthday } from "@/utils/birthday"

export type ProfileOption = { value: string; label: string }

type ControlProps = {
  label: string
  value: string
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

function SelectorControl({ label, value, disabled, style, testID, onPress }: ControlProps & { onPress: () => void }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label + "，" + value}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.control, disabled && styles.disabled, style]}
    >
      <Text text={value} style={styles.controlText} />
      <Feather name="chevron-down" size={17} color={ui.muted} accessible={false} />
    </Pressable>
  )
}

function PickerModal({ title, open, close, children }: {
  title: string; open: boolean; close: () => void; children: React.ReactNode
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="关闭选择" onPress={close} />
        <View style={styles.panel} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text text={title} style={styles.title} />
            <Pressable accessibilityRole="button" accessibilityLabel="取消选择" onPress={close} style={styles.close}>
              <Feather name="x" size={21} color={ui.muted} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  )
}

export function ProfileSelect({ value, label, options, placeholder = "请选择", onChange, ...control }:
  ControlProps & { options: ProfileOption[]; placeholder?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value)
  return (
    <>
      <SelectorControl {...control} label={label} value={value ? selected?.label ?? value : placeholder} onPress={() => setOpen(true)} />
      <PickerModal title={"选择" + label} open={open} close={() => setOpen(false)}>
        <ScrollView style={styles.choices} keyboardShouldPersistTaps="handled">
          {options.map(option => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: option.value === value }}
              testID={"profile-option-" + option.value}
              onPress={() => { onChange(option.value); setOpen(false) }}
              style={[styles.option, option.value === value && styles.selected]}
            >
              <Text text={option.label} style={styles.optionText} />
              {value === option.value && <Feather name="check" size={18} color={ui.primary} />}
            </Pressable>
          ))}
        </ScrollView>
      </PickerModal>
    </>
  )
}

const range = (start: number, end: number) => Array.from({ length: end - start + 1 }, (_, i) => start + i)
const YEAR_MIN = 1900

export function BirthdaySelect({ value, label, onChange, ...control }: ControlProps & { onChange: (value: string) => void }) {
  const today = new Date()
  const defaultYear = today.getFullYear() - 20
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState({ year: defaultYear, month: 1, day: 1 })
  const maxMonth = date.year === today.getFullYear() ? today.getMonth() + 1 : 12
  const maxDay = date.year === today.getFullYear() && date.month === today.getMonth() + 1
    ? today.getDate() : daysInMonth(date.year, date.month)
  const draft = formatBirthday(date)
  const age = birthdayAge(draft, today)

  const selectYear = (year: number) => {
    const month = Math.min(date.month, year === today.getFullYear() ? today.getMonth() + 1 : 12)
    const max = year === today.getFullYear() && month === today.getMonth() + 1
      ? today.getDate() : daysInMonth(year, month)
    setDate({ year, month, day: Math.min(date.day, max) })
  }
  const selectMonth = (month: number) => {
    const max = date.year === today.getFullYear() && month === today.getMonth() + 1
      ? today.getDate() : daysInMonth(date.year, month)
    setDate(previous => ({ ...previous, month, day: Math.min(previous.day, max) }))
  }
  const openPicker = () => {
    setDate(parseBirthday(value, today) ?? { year: defaultYear, month: 1, day: 1 })
    setOpen(true)
  }
  const column = (caption: string, items: number[], selected: number, onSelect: (v: number) => void) => (
    <View style={styles.dateColumn}>
      <Text text={caption} style={styles.columnLabel} />
      <ScrollView style={styles.dateList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {items.map(item => (
          <Pressable key={item} accessibilityRole="radio"
            accessibilityLabel={item + caption} accessibilityState={{ checked: item === selected }}
            testID={"birth-" + caption + "-" + item}
            onPress={() => onSelect(item)}
            style={[styles.dateOption, item === selected && styles.selected]}>
            <Text text={String(item)} style={styles.optionText} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
  return (
    <>
      <SelectorControl {...control} label={label} value={value || "请选择生日"} onPress={openPicker} />
      <PickerModal title="选择出生日期" open={open} close={() => setOpen(false)}>
        <View style={styles.dateSummary}>
          <Text text={draft} style={styles.title} />
          <Text text={age === null ? "" : "年龄 " + age + " 周岁"} style={styles.columnLabel} />
        </View>
        <View style={styles.dateColumns}>
          {column("年", range(YEAR_MIN, today.getFullYear()).reverse(), date.year, selectYear)}
          {column("月", range(1, maxMonth), date.month, selectMonth)}
          {column("日", range(1, maxDay), date.day, day => setDate(previous => ({ ...previous, day })))}
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={() => { onChange(""); setOpen(false) }} style={styles.clear}>
            <Text text="暂不填写" style={styles.columnLabel} />
          </Pressable>
          <Pressable testID="birth-confirm" accessibilityRole="button" disabled={age === null}
            onPress={() => { if (age !== null) { onChange(draft); setOpen(false) } }} style={styles.confirm}>
            <Text text="确定" style={styles.confirmText} />
          </Pressable>
        </View>
      </PickerModal>
    </>
  )
}

const styles = StyleSheet.create({
  control: { alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 11, paddingVertical: 9, minHeight: 42,
    backgroundColor: ui.wash, borderWidth: 1, borderColor: ui.line, borderRadius: ui.radius.field },
  controlText: { color: ui.ink, fontSize: 15, fontWeight: "500", flex: 1, flexShrink: 1 },
  disabled: { opacity: 0.55 },
  overlay: { flex: 1, backgroundColor: "rgba(35,52,42,0.30)", alignItems: "center", justifyContent: "center", padding: 20 },
  panel: { backgroundColor: ui.surface, borderRadius: ui.radius.surface, borderWidth: 1, borderColor: ui.line,
    padding: 17, maxWidth: 430, width: "100%", maxHeight: "80%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  title: { color: ui.ink, fontWeight: "600", fontSize: 17, lineHeight: 25 },
  close: { minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" },
  choices: { flexGrow: 0, flexShrink: 1 },
  option: { flexDirection: "row", minHeight: 46, paddingHorizontal: 11, paddingVertical: 10,
    borderRadius: ui.radius.field, alignItems: "center", justifyContent: "space-between", gap: 8 },
  selected: { backgroundColor: ui.tint },
  optionText: { color: ui.ink, fontSize: 15, lineHeight: 23, flexShrink: 1 },
  dateSummary: { alignItems: "center", paddingBottom: 12, gap: 4 },
  dateColumns: { flexDirection: "row", gap: 7 },
  dateColumn: { flex: 1, minWidth: 0, alignItems: "stretch" },
  columnLabel: { color: ui.muted, fontSize: 13, lineHeight: 21, textAlign: "center" },
  dateList: { height: 200, marginTop: 5, borderColor: ui.line, borderRadius: ui.radius.field, borderWidth: 1 },
  dateOption: { minHeight: 38, alignItems: "center", justifyContent: "center", marginHorizontal: 2 },
  actions: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 15 },
  clear: { minHeight: 44, flex: 1, justifyContent: "center" },
  confirm: { minHeight: 44, flex: 1, borderRadius: ui.radius.pill, backgroundColor: ui.primary, alignItems: "center", justifyContent: "center" },
  confirmText: { color: ui.surface, fontSize: 15, fontWeight: "600" },
})
