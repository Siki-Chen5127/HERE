import React, { FC, useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch, 
  ViewStyle,
  TextStyle,
} from "react-native"
import AV from "leancloud-storage/core"
import { useAuth } from "@/context/AuthContext"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"

const COLORS = {
  primary: '#10B981', 
  bg: '#F9FAFB',      
  white: '#FFFFFF',
  textMain: '#1F2937', 
  textSub: '#6B7280',  
  border: '#F3F4F6',   
  red: '#EF4444',
  redLight: '#FEF2F2',
  orange: '#F59E0B',
  orangeLight: '#FFFBEB',
  purple: '#8B5CF6', 
  purpleLight: '#F3E8FF',
}

export const SettingsScreen: FC<any> = ({ navigation }) => {
  const { logout } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [isRescueMode, setIsRescueMode] = useState(false)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData()
    })
    return unsubscribe
  }, [navigation])

  const fetchUserData = async () => {
    try {
      const currentUser = await AV.User.currentAsync()
      if (currentUser) {
        await currentUser.fetch()
        
        // 核心修改：优先获取 realName (真实姓名)
        const realName = currentUser.get('realName')
        const username = currentUser.getUsername()
        const mobile = currentUser.getMobilePhoneNumber() || currentUser.get('mobilePhoneNumber')

        setUser({
          displayName: realName || username || '用户', // 显示名优先级
          mobile: mobile,
          avatarChar: (realName || username || '?').charAt(0).toUpperCase(),
        })
      }
    } catch (error) {
      console.error("获取用户信息失败", error)
    }
  }

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出当前账号吗？", [
      { text: "取消", style: "cancel" },
      { text: "确定", style: "destructive", onPress: () => logout() },
    ])
  }

  const navigateTo = (screenName: string) => {
    try {
      navigation.navigate(screenName)
    } catch (e) {
      Alert.alert("提示", `页面 ${screenName} 正在开发中...`)
    }
  }

  const toggleRescueMode = (value: boolean) => {
    setIsRescueMode(value)
    if (value) {
      Alert.alert("🛡️ 开发者守护已开启", "深夜加班将强制弹窗提醒休息。")
    }
  }

  const testRescueNow = () => {
    navigation.navigate("RescueCheck")
  }

  return (
    <Screen 
      preset="scroll" 
      safeAreaEdges={['top']}
      style={$styles.screen}
      backgroundColor={COLORS.bg}
    >
      <View style={$styles.header}>
        <Text style={$styles.headerTitle} text="我的" />
      </View>

      <View style={$styles.contentContainer}>
        
        {/* 用户卡片 */}
        <View style={$styles.userCard}>
          <View style={$styles.avatarContainer}>
            <Text style={$styles.avatarText} text={user?.avatarChar || '?'} />
          </View>
          <View style={{ flex: 1 }}>
            {/* 修改：显示真实姓名 */}
            <Text style={$styles.userName} text={user?.displayName || '未登录'} />
            <Text style={$styles.userPhone} text={user?.mobile || '暂无手机号'} />
          </View>
        </View>

        {/* 菜单列表 */}
        <View style={$styles.menuGroup}>
          <MenuButton icon="🆔" label="个人档案" onPress={() => navigateTo('ProfileEdit')} />
          <MenuButton icon="🕒" label="历史轨迹记录" onPress={() => navigateTo('Trajectory')} />
          <MenuButton icon="👥" label="紧急联系人" isLast onPress={() => navigateTo('Contacts')} />
        </View>

        {/* 实验室功能 */}
        <View style={{ marginTop: 24 }}>
          <Text style={$styles.sectionTitle} text="实验室 (LABS)" />
          <View style={$styles.menuGroup}>
            <View style={$styles.switchItem}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>👨‍💻</Text>
                  <Text style={$styles.menuText} text="深夜加班救援" />
                </View>
                <Text style={$styles.switchSubText} text="凌晨强制休息提醒" />
              </View>
              <Switch
                value={isRescueMode}
                onValueChange={toggleRescueMode}
                trackColor={{ false: "#D1D5DB", true: COLORS.purple }}
                thumbColor={COLORS.white}
              />
            </View>
            
            {isRescueMode && (
              <TouchableOpacity 
                style={[$styles.menuItem, { borderBottomWidth: 0 }]} 
                onPress={testRescueNow}
              >
                <Text style={{ color: COLORS.purple, fontWeight: 'bold' }} text="⚡ 立即测试弹窗" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 功能演示 (DEMO) */}
        <View style={{ marginTop: 24 }}>
          <Text style={$styles.sectionTitle} text="功能演示 (DEMO)" />
          <View style={$styles.gridContainer}>
            {/* 修复：调整 Padding 防止文字截断 */}
            <TouchableOpacity 
              style={[$styles.demoBtn, { backgroundColor: COLORS.redLight, borderColor: '#FEE2E2' }]}
              onPress={() => navigation.navigate("FallAlert")}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>⚠️</Text>
              <Text 
                style={{ color: COLORS.red, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} 
                text="模拟跌倒检测" 
                numberOfLines={1} // 强制单行，不够就缩小
                adjustsFontSizeToFit // 自适应字体大小
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[$styles.demoBtn, { backgroundColor: COLORS.orangeLight, borderColor: '#FEF3C7' }]}
              onPress={() => navigation.navigate("CriticalAlert")}
            >
              <Text style={{ fontSize: 24, marginBottom: 4 }}>📡</Text>
              <Text 
                style={{ color: COLORS.orange, fontWeight: 'bold', fontSize: 13, textAlign: 'center' }} 
                text="模拟失联告警" 
                numberOfLines={1}
                adjustsFontSizeToFit
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 退出登录 */}
        <TouchableOpacity style={$styles.logoutBtn} onPress={handleLogout}>
          {/* 修复：增加宽度和内边距，防止文字被切 */}
          <Text style={$styles.logoutText} text="退出登录" />
        </TouchableOpacity>

      </View>
      <View style={{ height: 100 }} />
    </Screen>
  )
}

const MenuButton = ({ icon, label, onPress, isLast }: any) => (
  <TouchableOpacity 
    style={[$styles.menuItem, isLast && { borderBottomWidth: 0 }]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
      <Text style={$styles.menuText} text={label} />
    </View>
    <Text style={{ color: '#D1D5DB', fontSize: 18 }}>›</Text> 
  </TouchableOpacity>
)

const $styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg } as ViewStyle,
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  } as ViewStyle,
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.textMain } as TextStyle,
  contentContainer: { padding: 24 } as ViewStyle,
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  avatarContainer: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E7EB',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  } as ViewStyle,
  avatarText: { fontSize: 28, color: '#9CA3AF', fontWeight: 'bold' } as TextStyle,
  userName: { fontSize: 20, fontWeight: 'bold', color: COLORS.textMain, marginBottom: 4 } as TextStyle,
  userPhone: { fontSize: 14, color: COLORS.textSub } as TextStyle,
  
  menuGroup: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  } as ViewStyle,
  menuText: { fontSize: 16, fontWeight: '500', color: COLORS.textMain } as TextStyle,
  
  switchItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  } as ViewStyle,
  switchSubText: { fontSize: 12, color: COLORS.textSub, marginTop: 4, marginLeft: 30 } as TextStyle,

  sectionTitle: {
    fontSize: 12, fontWeight: 'bold', color: '#9CA3AF', marginBottom: 12, marginLeft: 4, textTransform: 'uppercase',
  } as TextStyle,
  gridContainer: { flexDirection: 'row', gap: 12 } as ViewStyle,
  
  // 修复：demoBtn 样式调整
  demoBtn: {
    flex: 1, 
    borderRadius: 12, 
    paddingVertical: 16, // 垂直 Padding
    paddingHorizontal: 8, // 水平 Padding 减小，给文字留空间
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1,
  } as ViewStyle,
  
  logoutBtn: {
    backgroundColor: COLORS.white, marginTop: 32, 
    paddingVertical: 16,
    paddingHorizontal: 32, // 增加水平 Padding
    borderRadius: 12, alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
  } as ViewStyle,
  logoutText: { color: COLORS.red, fontWeight: 'bold', fontSize: 16 } as TextStyle,
})