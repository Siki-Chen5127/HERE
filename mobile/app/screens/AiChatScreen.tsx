import React, { FC, useState, useRef, useEffect } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  StatusBar,
  ViewStyle,
  TextStyle,
  Keyboard
} from "react-native"
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from "react-native"
import Feather from "@expo/vector-icons/Feather"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon" 
import Markdown from 'react-native-markdown-display'
import { getHereApiErrorMessage, HereApiError, mobileApi } from "@/services/hereApi"
import { JournalModal } from "@/components/JournalModal"
import { useAuth } from "@/context/AuthContext"
import { loadString, saveString } from "@/utils/storage"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"

// --- 1. 配置与常量 ---

//  暖心主题色板
const THEME = {
  primary: ui.primary,
  primaryLight: ui.tint,
  bg: ui.canvas,
  white: ui.surface,
  textMain: ui.ink,
  textSub: ui.muted,
  bubbleUser: ui.primary,
  bubbleAi: ui.surface,
  border: ui.line,
  shadow: 'rgba(149, 157, 165, 0.1)',
}

function sendOnEnter(send: () => void) {
  return (event: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    const key = event.nativeEvent as TextInputKeyPressEventData & {
      shiftKey?: boolean
      isComposing?: boolean
      keyCode?: number
    }
    if (key.key !== "Enter" || key.shiftKey || key.isComposing || key.keyCode === 229) return
    event.preventDefault()
    send()
  }
}

// 启用 Android 布局动画
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  reasoningContent?: string
  isError?: boolean
}

const HISTORY_LIMIT = 100
const MAX_CHAT_LENGTH = 2000
const createWelcomeMessages = (): Message[] => [
  {
    id: "init-1",
    role: "assistant",
    content:
      "你好，我是你的安全助手。如果你感到不安、焦虑，或者只是想找人说说话，我会一直在这里陪着你。",
  },
]

const isStoredMessage = (value: unknown): value is Message => {
  if (!value || typeof value !== "object") return false
  const message = value as Partial<Message>
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    (message.reasoningContent === undefined ||
      typeof message.reasoningContent === "string") &&
    (message.isError === undefined ||
      typeof message.isError === "boolean")
  )
}

const readChatHistory = (storageKey: string): Message[] => {
  const raw = loadString(storageKey)

  if (!raw) return createWelcomeMessages()

  try {
    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return createWelcomeMessages()

    const history = parsed
      .filter(isStoredMessage)
      .filter((message) => !message.isError)
      .slice(-HISTORY_LIMIT)

    return history.length ? history : createWelcomeMessages()
  } catch {
    return createWelcomeMessages()
  }
}

// --- 2. 子组件：顶部导航栏 ---
const ChatHeader = ({ onBack }: { onBack: () => void }) => {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="返回关怀">
          <Feather name="arrow-left" size={22} color={ui.primary} />
        </TouchableOpacity>
        
        <View style={styles.avatarContainer}>
           <Feather name="message-circle" size={23} color={ui.primary} />
        </View>
        
        <View>
          <Text style={styles.headerTitle} text="Here 暖心助手" />
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText} text="聊聊今天发生的事" />
          </View>
        </View>
      </View>
    </View>
  )
}

// --- 3. 子组件：消息气泡 ---
const MessageBubble = ({ item }: { item: Message }) => {
  const isUser = item.role === 'user'
  const [reasoningExpanded, setReasoningExpanded] = useState(false)
  const hasReasoning = !isUser && !!item.reasoningContent?.trim()

  const markdownStyles = {
    body: { 
      color: isUser ? THEME.white : THEME.textMain, 
      fontSize: 16, 
      lineHeight: 26,
      fontFamily: Platform.OS === 'ios' ? 'PingFang SC' : 'sans-serif',
    },
    paragraph: { marginTop: 0, marginBottom: 8, flexWrap: 'wrap' },
    strong: { fontWeight: 'bold', color: isUser ? THEME.white : '#059669' },
    heading1: { fontSize: 20, fontWeight: 'bold', marginVertical: 10, color: isUser ? THEME.white : THEME.primary },
    list_item: { marginVertical: 4 },
    code_inline: { 
        backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : '#F3F4F6', 
        borderRadius: 4, 
        paddingHorizontal: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    }
  }

  return (
    <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
      {!isUser && (
        <View style={styles.aiAvatarSmall}>
          <Feather name="message-circle" size={14} color={ui.primary} />
        </View>
      )}
      
      <View style={[
        styles.bubble, 
        isUser ? styles.bubbleUser : styles.bubbleAi,
        { shadowColor: THEME.primary, shadowOpacity: isUser ? 0.1 : 0.05 }
      ]}>
        {hasReasoning && (
          <View style={styles.reasoningSection}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: reasoningExpanded }}
              onPress={() => setReasoningExpanded(current => !current)}
              style={styles.reasoningToggle}
            >
              <Text
                text={reasoningExpanded ? "收起思考内容 ▴" : "查看思考内容 ▾"}
                style={styles.reasoningTitle}
              />
            </TouchableOpacity>
            {reasoningExpanded && (
              <Text text={item.reasoningContent} selectable style={styles.reasoningText} />
            )}
          </View>
        )}
        <Markdown style={markdownStyles as any}>
          {item.content}
        </Markdown>
      </View>
    </View>
  )
}

// --- 5. 子组件：输入工具栏 ---
const InputToolbar = ({ 
  inputText, 
  setInputText, 
  onSend, 
  onExpand, // 新增：展开回调
  loading 
}: { 
  inputText: string, 
  setInputText: (t: string) => void, 
  onSend: () => void, 
  onExpand: () => void,
  loading: boolean 
}) => {
  const insets = useSafeAreaInsets()
  
  return (
    <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <Text text="写长篇日记 · 仅本机保存" style={styles.journalHint} />
      <View style={styles.inputContainer}>
        {/* 展开按钮 */}
        <TouchableOpacity 
          onPress={onExpand} 
          accessibilityRole="button"
          testID="chat-open-journal"
          accessibilityLabel="写长篇日记，查看本机历史日记"
          style={styles.expandBtn}
          activeOpacity={0.6}
        >
          <Text style={{ fontSize: 18 }}>
          <Icon icon="write" size={20} color={null} /> 
          </Text> 
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="有些话如果很难对人说..."
          placeholderTextColor="#9CA3AF"
          value={inputText}
          onChangeText={setInputText}
          testID="chat-message-input"
          maxLength={MAX_CHAT_LENGTH}
          accessibilityLabel="输入消息"
          onKeyPress={Platform.OS === "web" ? sendOnEnter(onSend) : undefined}
          onSubmitEditing={Platform.OS === "web" ? undefined : onSend}
          submitBehavior={Platform.OS === "web" ? "newline" : "submit"}
          returnKeyType="send"
          editable={!loading}
          multiline
        />
        
        <TouchableOpacity 
          onPress={onSend} 
          accessibilityRole="button"
          testID="chat-send"
          accessibilityLabel="发送消息"
          disabled={loading || !inputText.trim()}
          style={[
            styles.sendBtn, 
            { backgroundColor: (loading || !inputText.trim()) ? '#E5E7EB' : THEME.primary }
          ]}
        >
          {loading ? (
             <ActivityIndicator size="small" color="#fff" />
          ) : (
             <Icon icon="send" size={20} color={null} /> 
          )}
        </TouchableOpacity>
      </View>
      {Platform.OS === "web" && <Text text="Enter 发送 · Shift + Enter 换行" style={styles.keyHint} />}
    </View>
  )
}

// --- 6. 主页面组件 ---
export const AiChatScreen: FC<any> = ({ navigation }) => {
  const { currentUser } = useAuth()
  if (!currentUser?.id) return null
  const storageKey = `here.aiChat.v1.${currentUser.id}`
  return (
    <AiChatSession
      key={storageKey}
      navigation={navigation}
      storageKey={storageKey}
      journalKey={`here.journal.v1.${currentUser.id}`}
    />
  )
}

const AiChatSession: FC<{
  navigation: any
  storageKey: string
  journalKey: string
}> = ({ navigation, storageKey, journalKey }) => {
  const { width, fontScale } = useViewport()
  const desktop = Platform.OS === "web" && width >= 980 && fontScale < 1.3
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const sending = useRef(false)
  const [journalOpen, setJournalOpen] = useState(false)
  
  const flatListRef = useRef<FlatList>(null)
  
  const [messages, setMessages] = useState<Message[]>(() =>
  readChatHistory(storageKey),
)
  const [historySaveFailed, setHistorySaveFailed] = useState(false)

useEffect(() => {
  const history = messages
    .filter((message) => !message.isError)
    .slice(-HISTORY_LIMIT)

  try {
    const saved = saveString(storageKey, JSON.stringify(history))
    setHistorySaveFailed(!saved)
  } catch {
    setHistorySaveFailed(true)
  }
}, [messages, storageKey])

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 200)
  }

  const requestReply = async (history: Message[]) => {
    if (sending.current) return
    sending.current = true
    setLoading(true)
    scrollToEnd()
    if (Platform.OS !== "web") Keyboard.dismiss()

    try {
      // The local welcome message and failed replies aren't upstream conversation turns.
      const recent = history.filter(message => !message.isError && message.id !== "init-1").slice(-10)
      const firstUser = recent.findIndex(message => message.role === "user")
      const context = recent.slice(Math.max(0, firstUser))
        .map(({ role, content }) => ({ role, content: content.slice(0, MAX_CHAT_LENGTH) }))
        .filter(message => message.content.trim())
      const data = await mobileApi.chat(context)
      if (typeof data.content !== "string" || !data.content.trim()) {
        throw new Error("暖心助手暂时未返回有效内容，请重试。")
      }
      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: data.content,
        reasoningContent: data.reasoning_content ?? "",
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      const message = error instanceof HereApiError && error.status === 500
        ? "服务暂时异常（500），可以重试上一条消息。"
        : getHereApiErrorMessage(error, "暖心助手暂时无法连接，请稍后重试。")
      setMessages(prev => [...prev, {
        id: String(Date.now()),
        role: "assistant",
        content: message,
        isError: true,
      }])
    } finally {
      sending.current = false
      setLoading(false)
      scrollToEnd()
    }
  }

  const handleSend = () => {
    const userText = inputText.trim()
    if (!userText || sending.current || userText.length > MAX_CHAT_LENGTH) return
    const userMsg: Message = { id: String(Date.now()), role: "user", content: userText }
    const history = [...messages.filter(message => !message.isError), userMsg]
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setMessages(history)
    setInputText("")
    void requestReply(history)
  }

  const handleRetry = () => {
    if (sending.current || !messages[messages.length - 1]?.isError) return
    const history = messages.filter(message => !message.isError)
    if (history[history.length - 1]?.role !== "user") return
    setMessages(history)
    void requestReply(history)
  }


  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.bg} />
      <View style={[styles.workspace, desktop && styles.desktopWorkspace]}>
      {desktop && (
        <View style={styles.aside}>
          <View style={styles.asideIcon}><Feather name="message-circle" size={25} color={ui.primary} /></View>
          <Text text="聊一聊" style={styles.asideTitle} />
          <Text text="可以从今天的一件小事聊起。想为自己留下一篇长文，也可以打开本机日记慢慢写。" style={styles.asideCopy} />
        </View>
      )}
      <View style={[styles.conversation, desktop && styles.desktopConversation]}>
      <ChatHeader onBack={() => navigation.goBack()} />
      {historySaveFailed && (
         <Text
         text="本次聊天记录未能保存，退出后可能丢失。"
         accessibilityRole="alert"
         style={{
          color: "#B45309",
          backgroundColor: "#FEF3C7",
          paddingHorizontal: 16,
          paddingVertical: 8,
          fontSize: 14,
          lineHeight: 22,
    }}
  />
)}
      <KeyboardAvoidingView 
        behavior="padding" 
        style={{ flex: 1 }}
        keyboardVerticalOffset={20} 
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble item={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={[styles.msgRow, { marginLeft: 4 }]}>
                <View style={[styles.aiAvatarSmall, { backgroundColor: '#E5E7EB', height: 24}]}>
                   <Text style={{ fontSize: 15 }}>
                    <Icon icon="loading" size={15} color={null} />
                   </Text>
                </View>
                <View style={styles.loadingBubble}>
                   <Text style={{ fontSize: 12, lineHeight: 20, color: THEME.textSub }}>
                     深度思考中……
                   </Text>
                </View>
              </View>
            ) : messages[messages.length - 1]?.isError ? (
              <TouchableOpacity testID="chat-retry" accessibilityRole="button" onPress={handleRetry} style={styles.retryAction}>
                <Text text="重试上一条" style={styles.reasoningTitle} />
              </TouchableOpacity>
            ) : <View style={{ height: 10 }} /> 
          }
        />

        <InputToolbar 
          inputText={inputText} 
          setInputText={setInputText} 
          onSend={handleSend} 
          onExpand={() => setJournalOpen(true)}
          loading={loading} 
        />
      </KeyboardAvoidingView>
      </View>
      </View>

      <JournalModal
        visible={journalOpen}
        onClose={() => setJournalOpen(false)}
        storageKey={journalKey}
        chatLimit={MAX_CHAT_LENGTH}
        onUseInChat={(text) => {
          const combined = inputText.trim() ? inputText + "\n\n" + text : text
          if (combined.length > MAX_CHAT_LENGTH) return false
          setInputText(combined)
          return true
        }}
      />
    </View>
  )
}

// --- 7. 样式定义 ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  workspace: { flex: 1, minHeight: 0 },
  desktopWorkspace: { ...studentFrame, maxWidth: 1240, flexDirection: "row", padding: 28, gap: 25 },
  aside: { width: 235, padding: 23, backgroundColor: ui.honey, borderRadius: ui.radius.surface, alignSelf: "flex-start" },
  asideIcon: { marginBottom: 16 },
  asideTitle: { color: ui.ink, fontSize: 28, fontWeight: "700", marginBottom: 9 },
  asideCopy: { color: ui.muted, fontSize: 15, lineHeight: 24 },
  conversation: { flex: 1, minWidth: 0, minHeight: 0 },
  desktopConversation: { backgroundColor: ui.surface, borderColor: ui.line, borderWidth: 1, borderRadius: ui.radius.feature, overflow: "hidden" },
  keyHint: { color: ui.muted, fontSize: 12, marginTop: 7 },
  journalHint: { color: ui.primary, fontSize: 12, lineHeight: 20, marginBottom: 6, paddingLeft: 4 },
  retryAction: { alignSelf: "flex-start", marginHorizontal: 40, marginBottom: 12, borderWidth: 1, borderColor: ui.line, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  
  // Header
  header: {
    backgroundColor: THEME.bg, 
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)', 
    zIndex: 10,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 8, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatarContainer: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: THEME.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: THEME.textMain, marginBottom: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary, marginRight: 6 },
  onlineText: { fontSize: 11, color: THEME.textSub },

  // List
  listContent: { padding: 16, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', marginBottom: 20, maxWidth: '100%' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  
  aiAvatarSmall: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: THEME.white,
    borderWidth: 1, borderColor: THEME.border,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, marginTop: 4,
  },
  
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: ui.radius.nested,
    elevation: 1,
  },
  bubbleAi: {
    backgroundColor: THEME.white,
    borderTopLeftRadius: 4, 
    borderWidth: 1,
    borderColor: THEME.border,
  },
  bubbleUser: {
    backgroundColor: THEME.bubbleUser,
    borderTopRightRadius: 4,
  },
  reasoningSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  reasoningToggle: { minHeight: 44, justifyContent: 'center' },
  reasoningTitle: { fontSize: 14, lineHeight: 22, color: THEME.primary, fontWeight: '600' },
  reasoningText: { fontSize: 14, lineHeight: 24, color: THEME.textSub, marginTop: 6 },
  
  // Input
  inputBar: {
    backgroundColor: THEME.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F7F7',
    borderRadius: ui.radius.surface,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'flex-end', 
  },
  expandBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: THEME.textMain,
    maxHeight: 120, 
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  
  // Loading
  loadingBubble: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    marginTop: 4,
  },

})
