import React, { FC, useState, useRef } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ViewStyle,
  TextStyle,
  StatusBar
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "@/components/Text"
import Markdown from 'react-native-markdown-display'

// --- 配置 ---
const DEEPSEEK_KEY = 'sk-adb6bdd1ab434f9780fdca889e4fdb55'
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

const COLORS = {
  primary: '#10B981', 
  bg: '#F9FAFB',      
  white: '#FFFFFF',
  textMain: '#1F2937',
  textSub: '#6B7280',
  bubbleUser: '#10B981', 
  bubbleAi: '#FFFFFF',   
  border: '#E5E7EB',
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// 暖心提示语库
const WAITING_TIPS = [
  "正在用心倾听...",
  "正在为您整理温暖的建议...",
  "我在，请稍候...",
  "正在思考如何更好地帮助您...",
  "您的感受很重要，我正在理解...",
  "深呼吸，我正在回复..."
]

export const AiChatScreen: FC<any> = ({ navigation }) => {
  const insets = useSafeAreaInsets()
  const [inputText, setInputText] = useState("")
  const [loading, setLoading] = useState(false) 
  const [loadingText, setLoadingText] = useState("守护助手正在用心倾听...") // 动态提示语
  const flatListRef = useRef<FlatList>(null)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: '你好，我是你的安全助手。如果你感到不安、焦虑或者遇到了**麻烦**，请告诉我，我会一直陪着你。'
    }
  ])

  const scrollToEnd = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const handleSend = async () => {
    if (!inputText.trim() || loading) return

    const userText = inputText.trim()
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userText
    }

    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInputText("")
    
    // 随机选择一条暖心提示
    setLoadingText(WAITING_TIPS[Math.floor(Math.random() * WAITING_TIPS.length)])
    setLoading(true) 
    scrollToEnd()

    try {
      const response = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: newHistory.slice(-10).map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7
        })
      })

      const data = await response.json()
      
      if (data.choices && data.choices.length > 0) {
        const aiContent = data.choices[0].message.content
        const aiMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiContent
        }
        setMessages(prev => [...prev, aiMsg])
      } else {
        console.warn("API 响应异常", data)
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: '抱歉，网络连接稍微有点不稳定，请您再说一遍，我在听。'
        }])
      }

    } catch (error) {
      console.error("DeepSeek 请求失败", error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '安全助手暂时无法连接，请检查您的网络设置。'
      }])
    } finally {
      setLoading(false)
      scrollToEnd()
    }
  }

  // 渲染消息气泡
  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user'
    
    // 2. 根据角色动态生成 Markdown 样式
    const markdownStyles = {
      body: { 
        color: isUser ? COLORS.white : COLORS.textMain, 
        fontSize: 15, 
        lineHeight: 24 
      },
      paragraph: {
        marginTop: 0,
        marginBottom: 8,
        flexWrap: 'wrap',
      },
      strong: {
        fontWeight: 'bold',
        color: isUser ? COLORS.white : COLORS.textMain, 
      },
      em: {
        fontStyle: 'italic',
        color: isUser ? COLORS.white : COLORS.textMain,
      },
      heading1: {
        fontSize: 20,
        fontWeight: 'bold',
        color: isUser ? COLORS.white : COLORS.textMain,
        marginVertical: 10,
      },
      heading2: {
        fontSize: 18,
        fontWeight: 'bold',
        color: isUser ? COLORS.white : COLORS.textMain,
        marginVertical: 8,
      },
      list_item: {
        color: isUser ? COLORS.white : COLORS.textMain,
        marginVertical: 4,
      },
      bullet_list_icon: {
        color: isUser ? COLORS.white : COLORS.textMain,
        marginLeft: 10,
        marginRight: 10,
      },
      code_inline: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
        color: isUser ? COLORS.white : COLORS.textMain,
        borderRadius: 4,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      },
      fence: {
        backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
        color: isUser ? COLORS.white : COLORS.textMain,
        marginVertical: 8,
        padding: 10,
        borderRadius: 8,
      },
      link: {
        color: isUser ? '#E0F2FE' : '#2563EB',
        textDecorationLine: 'underline',
      }
    }

    return (
      <View style={[
        $styles.msgRow, 
        isUser ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }
      ]}>
        {!isUser && (
          <View style={$styles.aiAvatar}>
            <Text style={{ fontSize: 12 }}>🛡️</Text>
          </View>
        )}
        <View style={[
          $styles.bubble,
          isUser ? $styles.bubbleUser : $styles.bubbleAi
        ]}>
          {/* 使用 Markdown 组件渲染内容 */}
          <Markdown style={markdownStyles as any}>
            {item.content}
          </Markdown>
        </View>
      </View>
    )
  }

  return (
    <View style={$styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <View style={[$styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Text style={{ fontSize: 20 }}>←</Text>
          </TouchableOpacity>
          
          <View style={$styles.headerIcon}>
            <Text style={{ color: 'white', fontSize: 16 }}>🛡️</Text>
          </View>
          
          <View>
            <Text style={$styles.headerTitle} text="HERE 智能助手" />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={$styles.onlineDot} />
              <Text style={$styles.onlineText} text="DeepSeek Online" />
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          style={{ flex: 1, backgroundColor: COLORS.bg }}
          ListFooterComponent={
            loading ? (
              <View style={$styles.msgRow}>
                <View style={$styles.aiAvatar}>
                  <Text style={{ fontSize: 12 }}>🛡️</Text>
                </View>
                <View style={[$styles.bubble, $styles.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  {/* 使用动态提示语 */}
                  <Text style={{ fontSize: 12, color: COLORS.textSub }}>{loadingText}</Text>
                </View>
              </View>
            ) : null
          }
        />

        <View style={[$styles.inputBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={$styles.inputContainer}>
            <TextInput
              style={$styles.input}
              placeholder="请告诉我您的状况..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              editable={!loading} 
            />
            <TouchableOpacity 
              onPress={handleSend} 
              disabled={loading || !inputText.trim()}
              style={{ opacity: (loading || !inputText.trim()) ? 0.3 : 1, padding: 4 }}
            >
              <Text style={{ fontSize: 20, color: COLORS.primary }}>✈️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const $styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,

  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  } as ViewStyle,

  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 4,
  } as ViewStyle,
  onlineText: { fontSize: 10, color: '#059669' } as TextStyle,

  msgRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  } as ViewStyle,
  
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 4,
  } as ViewStyle,

  bubble: {
    maxWidth: '85%', // 稍微调宽一点，容纳 Markdown 内容
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  } as ViewStyle,

  bubbleAi: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 4, 
  } as ViewStyle,

  bubbleUser: {
    backgroundColor: COLORS.bubbleUser,
    borderTopRightRadius: 4,
  } as ViewStyle,

  msgText: { fontSize: 15, lineHeight: 22 } as TextStyle,

  inputBar: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  } as ViewStyle,

  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6', 
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10, 
    alignItems: 'center',
  } as ViewStyle,

  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textMain,
    maxHeight: 100,
    padding: 0, 
  } as TextStyle,
})