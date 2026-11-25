import { Alert } from "@/components/Feedback"
import React, { FC, useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ViewStyle,
  TextStyle,
  Linking,
  ActivityIndicator
} from "react-native"

// 🟢 2. 引入本地 SQLite
import * as SQLite from 'expo-sqlite'

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { Icon } from "@/components/Icon" 
import { usersRepository } from "@/services/database/repositories"
import { useFocusEffect } from "@react-navigation/native"
import Feather from "@expo/vector-icons/Feather"
import { studentFrame, studentUi as ui } from "@/theme/studentUi"
import { useViewport } from "@/utils/useViewport"

// --- 颜色配置 ---
const COLORS = {
  primary: ui.primary,
  bg: ui.canvas,
  white: ui.surface,
  textMain: ui.ink,
  textSub: ui.muted,
  border: ui.line,
}

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#2563EB' }, // 蓝
  { bg: '#D1FAE5', text: '#059669' }, // 绿
  { bg: '#FEF3C7', text: '#D97706' }, // 黄
  { bg: '#F3E8FF', text: '#7C3AED' }, // 紫
  { bg: '#FCE7F3', text: '#DB2777' }, // 粉
]

// 🟢 3. 打开数据库连接
const db = SQLite.openDatabaseSync('assignment.db')

export const ContactsScreen: FC<any> = ({ navigation }) => {
  const { width, fontScale } = useViewport()
  const desktop = width >= 900 && fontScale < 1.3
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      fetchContacts()
    }, [])
  )

  const fetchContacts = () => {
    setLoading(true)
    try {
      // 🟢 4. 获取当前用户的本地 ID
      const activeUser = usersRepository.getActiveUser()
      if (!activeUser) throw new Error("未找到当前登录用户")
      const ownerId = String(activeUser.id)

      // 🟢 5. 从 SQLite 获取紧急联系人列表
      const results = db.getAllSync<{id: number, name: string, phone: string}>(
        'SELECT * FROM EmergencyContact WHERE ownerId = ? ORDER BY id DESC',
        ownerId
      )
      
      const data = results.map(item => ({
        id: String(item.id), // FlatList 的 key 需要 string
        name: item.name,
        phone: item.phone,
      }))
      
      setContacts(data)
    } catch (error: any) {
      console.error("查询失败:", error)
      Alert.alert("错误", "获取本地联系人列表失败")
      setContacts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCall = (phone: string) => {
    if (!phone) return
    Linking.openURL(`tel:${phone}`).catch(err => 
      Alert.alert("错误", "无法打开拨号界面")
    )
  }

  const handleEdit = (item: any) => {
    navigation.navigate('ContactEdit', {
      contactId: item.id,
      initialName: item.name,
      initialPhone: item.phone
    })
  }

  const handleAdd = () => {
    navigation.navigate('ContactEdit')
  }

  const renderItem = ({ item, index }: any) => {
    const colorStyle = AVATAR_COLORS[index % AVATAR_COLORS.length]
    const firstChar = item.name ? item.name.charAt(0) : '?'

    return (
      <TouchableOpacity 
        style={$styles.card} 
        activeOpacity={0.9}
        onPress={() => handleEdit(item)}
      >
        <View style={[$styles.avatar, { backgroundColor: colorStyle.bg }]}>
          <Text style={[$styles.avatarText, { color: colorStyle.text }]} text={firstChar} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={$styles.cardTitle} text={item.name} />
          <Text style={$styles.cardSubtitle} text={item.phone} />
        </View>

        <TouchableOpacity 
          style={$styles.callBtn} 
          onPress={(e) => {
            e.stopPropagation()
            handleCall(item.phone)
          }}
        >
          <Feather name="phone" size={17} color={ui.surface} />
        </TouchableOpacity>
      </TouchableOpacity>
    )
  }

  return (
    <Screen 
      preset="fixed" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      backgroundColor={COLORS.bg}
    >
      <View style={$styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Text style={{ fontSize: 20 }}>
            <Icon icon="back" size={20} color={null} /> 
          </Text>
        </TouchableOpacity>
        <Text style={$styles.headerTitle} text="紧急联系人" />
        <TouchableOpacity onPress={handleAdd} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="添加联系人">
          <Text style={$styles.addBtnText} text="+" />
        </TouchableOpacity>
      </View>

      <View style={[$styles.workspace, desktop && $styles.desktopWorkspace]}>
      <View style={[$styles.publicContacts, desktop && $styles.publicAside]}>
         <View style={[$styles.card, { borderColor: '#edd6ca', borderWidth: 1 }]}>
          <View style={[$styles.avatar, { backgroundColor: '#FEE2E2' }]}>
            <Feather name="shield" size={22} color={ui.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={$styles.cardTitle} text="辖区派出所" />
            <Text style={$styles.cardSubtitle} text="110" />
          </View>
          <TouchableOpacity 
            style={[$styles.callBtn, { backgroundColor: '#EF4444' }]} 
            onPress={() => handleCall('110')}
          >
            <Feather name="phone" size={17} color={ui.surface} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={$styles.personalContacts}>
      {desktop && <Text text="我的联系人" style={$styles.listHeading} />}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={$styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#9CA3AF' }} text="暂无联系人，请点击右上角添加" />
            </View>
          }
        />
      )}
      </View>
      </View>
      
    </Screen>
  )
}

const $styles = StyleSheet.create({
  workspace: { flex: 1, minHeight: 0, ...studentFrame },
  desktopWorkspace: { flexDirection: "row-reverse", alignItems: "stretch", gap: 16, padding: 20 },
  publicContacts: { paddingHorizontal: 24, paddingTop: 20 },
  publicAside: { width: 300, paddingHorizontal: 0, alignSelf: "flex-start" },
  personalContacts: { flex: 1, minWidth: 0, minHeight: 0 },
  listHeading: { color: ui.ink, fontWeight: "700", paddingHorizontal: 24, paddingTop: 16, fontSize: 19 },
  screen: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  } as ViewStyle,
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  addBtnText: { fontSize: 28, color: COLORS.primary, lineHeight: 28 } as TextStyle,

  listContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  } as ViewStyle,

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  avatarText: { fontSize: 18, fontWeight: 'bold' } as TextStyle,

  cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 2 } as TextStyle,
  cardSubtitle: { fontSize: 14, color: COLORS.textSub } as TextStyle,

  callBtn: {
    width: 40,
    height: 40,
    borderRadius: ui.radius.surface,
    backgroundColor: COLORS.primary, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
})
