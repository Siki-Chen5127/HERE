import React, { FC, useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  ViewStyle,
  TextStyle,
  Linking,
  ActivityIndicator
} from "react-native"
import AV from "leancloud-storage/core"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useFocusEffect } from "@react-navigation/native"

// --- 颜色配置 ---
const COLORS = {
  primary: '#10B981', 
  bg: '#F9FAFB',      
  white: '#FFFFFF',
  textMain: '#1F2937', 
  textSub: '#6B7280', 
  border: '#F3F4F6',
}

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#2563EB' }, // 蓝
  { bg: '#D1FAE5', text: '#059669' }, // 绿
  { bg: '#FEF3C7', text: '#D97706' }, // 黄
  { bg: '#F3E8FF', text: '#7C3AED' }, // 紫
  { bg: '#FCE7F3', text: '#DB2777' }, // 粉
]

export const ContactsScreen: FC<any> = ({ navigation }) => {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useFocusEffect(
    useCallback(() => {
      fetchContacts()
    }, [])
  )

  const fetchContacts = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      const query = new AV.Query('EmergencyContact')
      query.equalTo('owner', currentUser)
      query.descending('createdAt') 
      const results = await query.find()
      
      const data = results.map(item => ({
        id: item.id,
        name: item.get('name'),
        phone: item.get('phone'),
      }))
      
      setContacts(data)
    } catch (error: any) {
      console.error("查询失败:", error)
      // 如果是表不存在的错误(101)，可以忽略或提示为空
      if (error.code === 101) {
        setContacts([])
      } else {
        Alert.alert("错误", "获取联系人列表失败: " + error.message)
      }
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
          <Text style={{ fontSize: 18 }}>📞</Text>
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
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={$styles.headerTitle} text="紧急联系人" />
        <TouchableOpacity onPress={handleAdd} style={{ padding: 8 }}>
          <Text style={$styles.addBtnText} text="+" />
        </TouchableOpacity>
      </View>

      {/* 固定列表：派出所 */}
      <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
         <View style={[$styles.card, { borderColor: '#FEE2E2', borderWidth: 1 }]}>
          <View style={[$styles.avatar, { backgroundColor: '#FEE2E2' }]}>
            <Text style={{ fontSize: 24 }}>🛡️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={$styles.cardTitle} text="辖区派出所" />
            <Text style={$styles.cardSubtitle} text="110" />
          </View>
          <TouchableOpacity 
            style={[$styles.callBtn, { backgroundColor: '#EF4444' }]} 
            onPress={() => handleCall('110')}
          >
            <Text style={{ fontSize: 18 }}>📞</Text>
          </TouchableOpacity>
        </View>
      </View>

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
      
    </Screen>
  )
}

const $styles = StyleSheet.create({
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
    borderRadius: 20,
    backgroundColor: COLORS.primary, 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
})