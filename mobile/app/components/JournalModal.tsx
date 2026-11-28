import { useState, useEffect } from "react"
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native"
import Feather from "@expo/vector-icons/Feather"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { studentUi as ui } from "@/theme/studentUi"
import { loadString, saveString } from "@/utils/storage"

const MAX_JOURNAL_LENGTH = 50000
type JournalEntry = { id: string; text: string; createdAt: string; updatedAt: string }

function readEntries(key: string): JournalEntry[] {
  const raw = loadString(key)
  if (!raw) return []
  const parsed: unknown = JSON.parse(raw)
  if (!Array.isArray(parsed) || !parsed.every(entry =>
    entry && typeof entry.id === "string" && typeof entry.text === "string" &&
    typeof entry.createdAt === "string" && Number.isFinite(Date.parse(entry.createdAt)) &&
    typeof entry.updatedAt === "string" && Number.isFinite(Date.parse(entry.updatedAt))
  )) throw new Error("Invalid journal data")
  return parsed.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

const dateLabel = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" }) +
    " " + date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function JournalModal({ visible, onClose, storageKey, onUseInChat, chatLimit }: {
  visible: boolean
  onClose: () => void
  storageKey: string
  onUseInChat: (text: string) => boolean
  chatLimit: number
}) {
  const insets = useSafeAreaInsets()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [view, setView] = useState<"write" | "history">("write")
  const [entryId, setEntryId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [readFailed, setReadFailed] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const current = entries.find(entry => entry.id === entryId)
  const dirty = draft !== (current?.text ?? "")

  useEffect(() => {
    if (!visible) return
    try {
      setEntries(readEntries(storageKey))
      setReadFailed(false)
      setError("")
    } catch {
      setReadFailed(true)
      setError("暂时无法读取本机日记。已保留原有数据，请稍后重试。")
    }
  }, [visible, storageKey])

  const store = (next: JournalEntry[]) => {
    if (readFailed || !saveString(storageKey, JSON.stringify(next))) {
      setError("未能保存到本机，请检查存储空间或浏览器设置后重试。")
      return false
    }
    setEntries(next)
    setError("")
    return true
  }
  const edit = (entry: JournalEntry | null) => {
    if (dirty && (entry?.id ?? null) === entryId) { setView("write"); return }
    if (dirty) {
      setError("还有未保存的修改，请先保存或点击放弃修改。")
      setView("write")
      return
    }
    setEntryId(entry?.id ?? null)
    setDraft(entry?.text ?? "")
    setView("write")
    setError("")
    setNotice("")
    setConfirmDelete(false)
  }

  const save = () => {
    if (!draft.trim() || readFailed) return
    const now = new Date().toISOString()
    const updated = { id: current?.id ?? String(Date.now()) + "-" + Math.random().toString(36).slice(2),
      createdAt: current?.createdAt ?? now, updatedAt: now, text: draft }
    const next = [updated, ...entries.filter(entry => entry.id !== updated.id)]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (!store(next)) return
    setEntryId(null)
    setDraft("")
    setView("history")
    setConfirmDelete(false)
    setNotice("日记已保存在本机。")
  }
  const remove = () => {
    if (!current || !store(entries.filter(entry => entry.id !== current.id))) return
    setEntryId(null)
    setDraft("")
    setView("history")
    setConfirmDelete(false)
    setNotice("日记已删除。")
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.panel, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <View style={styles.heading}>
              <Feather name="book-open" size={22} color={ui.primary} />
              <Text text="我的日记" style={styles.title} />
            </View>
            <Pressable testID="journal-close" accessibilityRole="button" onPress={onClose} style={styles.smallAction}>
              <Text text="收起" style={styles.link} />
            </Pressable>
          </View>
          <Text text="慢慢写，点击保存后仅留在当前设备。日记不会自动发送给 AI 或辅导员。" style={styles.hint} />
          <View style={styles.tabs}>
            <Pressable testID="journal-write" accessibilityRole="tab" accessibilityState={{ selected: view === "write" }}
              style={[styles.tab, view === "write" && styles.tabActive]} onPress={() => setView("write")}>
              <Text text="写日记" style={styles.link} />
            </Pressable>
            <Pressable testID="journal-history" accessibilityRole="tab" accessibilityState={{ selected: view === "history" }}
              style={[styles.tab, view === "history" && styles.tabActive]} onPress={() => { setView("history"); setConfirmDelete(false) }}>
              <Text text={"历史日记 (" + entries.length + ")"} style={styles.link} />
            </Pressable>
          </View>
          {!!error && <Text text={error} accessibilityRole="alert" style={styles.error} />}
          {!!notice && <Text text={notice} accessibilityLiveRegion="polite" style={styles.notice} />}
          {view === "history" ? (
            <ScrollView testID="journal-list" style={styles.body} contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {!entries.length && !readFailed && (
                <View style={styles.empty}>
                  <Feather name="book" size={28} color={ui.muted} />
                  <Text text="这里还没有日记" style={styles.entryTitle} />
                  <Text text="今天有什么想记下来的？" style={styles.hint} />
                </View>
              )}
              {entries.map(entry => (
                <Pressable key={entry.id} testID={"journal-entry-" + entry.id} accessibilityRole="button"
                  onPress={() => edit(entry)} style={styles.card}>
                  <Text text={dateLabel(entry.createdAt)} style={styles.date} />
                  <Text text={entry.text.trim().split(/\r?\n/)[0]} numberOfLines={1} style={styles.entryTitle} />
                  <Text text={entry.text} numberOfLines={3} style={styles.preview} />
                </Pressable>
              ))}
                <Pressable testID="journal-new" accessibilityRole="button" onPress={() => edit(null)} style={styles.secondary}>
                  <Text text="＋ 写一篇新的日记" style={styles.link} />
                </Pressable>
            </ScrollView>
          ) : (
            <View style={styles.body}>
              <View style={styles.editorHeader}>
                <Text text={current ? dateLabel(current.createdAt) : dateLabel(new Date().toISOString())} style={styles.date} />
                {!!current && (
                  <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={styles.smallAction}>
                    <Text text="删除" style={styles.danger} />
                  </Pressable>
                )}
              </View>
              <TextInput testID="journal-text" accessibilityLabel="日记内容" value={draft}
                onChangeText={text => { setDraft(text); setNotice(""); if (!readFailed) setError("") }}
                multiline maxLength={MAX_JOURNAL_LENGTH} placeholder="从今天的一件小事开始吧……"
                placeholderTextColor={ui.muted} textAlignVertical="top" style={styles.editor} />
              <View style={styles.editorHeader}>
                <Text text={draft.length + " 字 · 最多 " + MAX_JOURNAL_LENGTH} style={styles.date} />
                {dirty && <Pressable accessibilityRole="button" onPress={() => { setDraft(current?.text ?? ""); setError("") }} style={styles.smallAction}>
                  <Text text="放弃修改" style={styles.link} />
                </Pressable>}
              </View>
              {confirmDelete && (
                <View style={styles.deletePanel}>
                  <Text text="要删除这篇日记吗？" style={styles.preview} />
                  <View style={styles.actions}>
                    <Pressable style={styles.secondary} onPress={() => setConfirmDelete(false)}><Text text="取消" style={styles.link} /></Pressable>
                    <Pressable style={styles.secondary} onPress={remove}><Text text="确认删除" style={styles.danger} /></Pressable>
                  </View>
                </View>
              )}
              <View style={styles.actions}>
                <Pressable testID="journal-to-chat" accessibilityRole="button"
                  disabled={!draft.trim() || draft.length > chatLimit}
                  onPress={() => { if (onUseInChat(draft)) onClose(); else setError("聊天输入框内容太长，请缩短后再发送。") }}
                  style={[styles.secondary, (!draft.trim() || draft.length > chatLimit) && styles.disabled]}>
                  <Text text="放入聊天" style={styles.link} />
                </Pressable>
                <Pressable testID="journal-save" accessibilityRole="button" accessibilityState={{ disabled: !draft.trim() || readFailed }}
                  disabled={!draft.trim() || readFailed} onPress={save}
                  style={[styles.primary, (!draft.trim() || readFailed) && styles.disabled]}>
                  <Text text="保存日记" style={styles.primaryText} />
                </Pressable>
              </View>
              <Text text={draft.length > chatLimit ? "长文可以完整保存；如需聊天，请将内容缩短至 " + chatLimit + " 字以内。" : "放入聊天只会填到输入框，是否发送由你决定。"} style={styles.hint} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: ui.canvas },
  panel: { alignSelf: "center", flex: 1, width: "100%", maxWidth: 720, minHeight: 0, paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heading: { flexDirection: "row", gap: 9, alignItems: "center" },
  title: { color: ui.ink, fontSize: 23, fontWeight: "700", lineHeight: 32 },
  hint: { color: ui.muted, fontSize: 13, lineHeight: 21 },
  tabs: { flexDirection: "row", backgroundColor: ui.tint, borderRadius: 999, padding: 4, gap: 5 },
  tab: { flex: 1, padding: 10, alignItems: "center", borderRadius: 999 },
  tabActive: { backgroundColor: ui.surface },
  link: { color: ui.primary, fontSize: 14, fontWeight: "600" },
  date: { color: ui.muted, fontSize: 12, lineHeight: 20 },
  notice: { color: ui.primary, fontSize: 13 },
  error: { color: ui.danger, fontSize: 13, lineHeight: 21 },
  danger: { color: ui.danger, fontSize: 14 },
  body: { flex: 1, minHeight: 0, gap: 10 },
  list: { paddingVertical: 4, paddingBottom: 16, gap: 12 },
  card: { backgroundColor: ui.surface, borderWidth: 1, borderColor: ui.line, borderRadius: ui.radius.nested, padding: 15, gap: 7 },
  entryTitle: { color: ui.ink, fontSize: 16, fontWeight: "600", lineHeight: 24 },
  preview: { color: ui.muted, fontSize: 14, lineHeight: 23 },
  empty: { alignItems: "center", paddingVertical: 28, gap: 10 },
  editorHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" },
  editor: { flex: 1, minHeight: 110, backgroundColor: ui.surface, color: ui.ink, borderRadius: ui.radius.nested, borderWidth: 1, borderColor: ui.line, padding: 15, fontSize: 17, lineHeight: 28 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  smallAction: { minHeight: 38, paddingHorizontal: 6, justifyContent: "center" },
  secondary: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: ui.line, borderRadius: 999, alignItems: "center", justifyContent: "center", padding: 10 },
  primary: { flex: 1, minHeight: 46, borderRadius: 999, backgroundColor: ui.primary, alignItems: "center", justifyContent: "center", padding: 10 },
  primaryText: { color: ui.surface, fontWeight: "600", fontSize: 15 },
  disabled: { opacity: 0.45 },
  deletePanel: { gap: 8, padding: 10, borderRadius: ui.radius.nested, backgroundColor: ui.dangerSurface },
})
