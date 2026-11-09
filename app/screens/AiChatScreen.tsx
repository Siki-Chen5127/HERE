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
  Keyboard,
  Modal,
  SafeAreaView
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon" 
import Markdown from 'react-native-markdown-display'
import { getHereApiErrorMessage, mobileApi } from "@/services/hereApi"
import { useAuth } from "@/context/AuthContext"
import { loadString, saveString } from "@/utils/storage"

// --- 1. 配置与常量 ---

//  暖心主题色板
const THEME = {
  primary: '#059669',    // 森绿色
  primaryLight: '#D1FAE5',
  bg: '#FFFBF5',         // 暖米色背景
  white: '#FFFFFF',
  textMain: '#2C3333',   
  textSub: '#829090',
  bubbleUser: '#059669', 
  bubbleAi: '#FFFFFF',   
  border: '#F0E6D2',     
  shadow: 'rgba(149, 157, 165, 0.1)',
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
        <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Icon icon="back" size={24} color={null} /> 
        </TouchableOpacity>
        
        <View style={styles.avatarContainer}>
           <Text style={{ fontSize: 20 }}>🛡️</Text>
        </View>
        
        <View>
          <Text style={styles.headerTitle} text="Here 暖心助手" />
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText} text="随时待命 倾听你的心声" />
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
          <Text style={{ fontSize: 14 }}>🛡️</Text>
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

// --- 4. 子组件：全屏写信模式 (修复状态栏遮挡) ---
const ExpandedInputModal = ({ 
  visible, 
  onClose, 
  onSend, 
  text, 
  onChangeText 
}: { 
  visible: boolean, 
  onClose: () => void, 
  onSend: () => void,
  text: string,
  onChangeText: (t: string) => void
}) => {
  const insets = useSafeAreaInsets() // 获取安全区域距离
  
  if (!visible) return null
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen">
      <View style={{ flex: 1, backgroundColor: THEME.bg, paddingTop: insets.top + 30 }}>  
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{top:10, bottom:10, left:10, right:10}}>
            <Text style={{ fontSize: 16, color: THEME.textSub }}>收起</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: 'bold', color: THEME.textMain }}>写信给助手</Text>
          <TouchableOpacity 
            onPress={onSend} 
            disabled={!text.trim()}
          >
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: !text.trim() ? '#ccc' : THEME.primary }}
            numberOfLines={1}
            adjustsFontSizeToFit >
            发送</Text>
          </TouchableOpacity>
        </View>
        
        <TextInput
          style={styles.modalInput}
          multiline
          placeholder="在这里慢慢写，我会认真听..."
          placeholderTextColor="#9CA3AF"
          value={text}
          onChangeText={onChangeText}
          autoFocus={true}
          textAlignVertical="top"
        />
      </View>
    </Modal>
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
      <View style={styles.inputContainer}>
        {/* 展开按钮 */}
        <TouchableOpacity 
          onPress={onExpand} 
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
          onSubmitEditing={onSend} 
          returnKeyType="default"
          editable={!loading}
          multiline
        />
        
        <TouchableOpacity 
          onPress={onSend} 
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
    />
  )
}

const AiChatSession: FC<{
  navigation: any
  storageKey: string
}> = ({ navigation, storageKey }) => {
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [isExpandedMode, setExpandedMode] = useState(false) // 新增：控制全屏模式
  
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

  const handleSend = async () => {
    if (!inputText.trim() || loading) return

    
    setExpandedMode(false)

    const userText = inputText.trim()
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: userText }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInputText("")
    
    setLoading(true)
    scrollToEnd()
    Keyboard.dismiss()

    try {
      const data = await mobileApi.chat(
        newHistory.filter(message => !message.isError).slice(-10)
          .map(({ role, content }) => ({ role, content })),
      )
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        reasoningContent: data.reasoning_content ?? "",
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      console.error("AI Error", error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: getHereApiErrorMessage(error, '暖心助手暂时无法连接，请稍后重试。'),
        isError: true,
      }])
    } finally {
      setLoading(false)
      scrollToEnd()
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.bg} />
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
            ) : <View style={{ height: 10 }} /> 
          }
        />

        <InputToolbar 
          inputText={inputText} 
          setInputText={setInputText} 
          onSend={handleSend} 
          onExpand={() => setExpandedMode(true)}
          loading={loading} 
        />
      </KeyboardAvoidingView>

      {/* 全屏写信模式 Modal */}
      <ExpandedInputModal 
        visible={isExpandedMode}
        onClose={() => setExpandedMode(false)}
        onSend={handleSend}
        text={inputText}
        onChangeText={setInputText}
      />
    </View>
  )
}

// --- 7. 样式定义 ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  
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
  backButton: { marginRight: 12 },
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
    borderRadius: 20,
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
    borderRadius: 24,
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

  // Modal Styles (新)
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  modalInput: {
    flex: 1,
    padding: 20,
    fontSize: 18,
    color: THEME.textMain,
    lineHeight: 28,
  }
})
