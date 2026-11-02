import React, { FC, useEffect, useState } from "react"
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  StatusBar,
  Switch,
} from "react-native"

import { useAuth } from "@/context/AuthContext"
import { Text } from "@/components/Text"
import { Icon, IconTypes } from "@/components/Icon" 
import { colors } from "@/theme/colors"
import { $styles } from "@/theme/styles" 
import { spacing } from "@/theme/spacing"
import { usersRepository } from "@/services/database/repositories"

// 1. 页面配置

// 深色主题配色
const THEME = {
  bg: colors.palette.deepSpace,           // #f0f2f7ff
  cardBg: "rgba(233, 210, 210, 0.08)",    // 玻璃拟态深色底
  cardBorder: "rgba(255, 255, 255, 0.1)", // 微光边框
  textMain: "#FFFFFF",
  textSub: "rgba(255, 255, 255, 0.6)",
  divider: "rgba(255, 255, 255, 0.08)",
}


/**
 * 🔹 用户头部卡片
 */
const UserHeader = ({ user }: { user: any }) => {
  return (
    <View style={[styles.glassCard, $styles.row]}>
      {/* 头像 */}
      <View style={styles.avatarBox}>
         <Text style={styles.avatarText} text={user?.avatarChar || '?'} />
      </View>
      
      {/* 信息 */}
      <View style={{ flex: 1 }}>
        <Text 
          style={styles.userName} 
          text={user?.displayName || '未登录'} 
          numberOfLines={1} 
        />
        <View style={styles.userTag}>
          <Text style={styles.userTagText} text={user?.mobile || '暂无手机号'} />
        </View>
      </View>
    </View>
  )
}


interface MenuRowProps {
  icon: IconTypes 
  label: string
  onPress: () => void
  isLast?: boolean
  rightElement?: React.ReactNode
}

const MenuRow = ({ icon, label, onPress, isLast, rightElement }: MenuRowProps) => {
  return (
    <TouchableOpacity 
      style={[styles.menuRow, $styles.rowBetween, isLast && { borderBottomWidth: 0 }]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={$styles.row}>
        <View style={{ marginRight: 12 }}>
          <Icon icon={icon} size={24} color={null} />
        </View>
        <Text style={styles.menuLabel} text={label} />
      </View>
      
      <View>
        {rightElement || <Icon icon="caretRight" size={20} color={null} />}
      </View>
    </TouchableOpacity>
  )
}

export const SettingsScreen: FC<any> = ({ navigation }) => {
  const { logout } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [isRescueMode, setIsRescueMode] = useState(false)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchUserData)
    return unsubscribe
  }, [navigation])

  const fetchUserData = () => {
    try {
      // 🟢 4. 从本地 SQLite 获取当前用户信息
      const currentUser = usersRepository.getActiveUser()
      if (currentUser) {
        const realName = currentUser.realName
        const mobile = currentUser.phone

        setUser({
          displayName: realName || mobile || '用户',
          mobile: mobile || '暂无手机号',
          avatarChar: (realName || mobile || '?').charAt(0).toUpperCase(),
        })
      }
    } catch (error) { 
      console.error("读取本地用户信息失败", error) 
    }
  }

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要离开 HERE 吗？", [
      { text: "我再想想", style: "cancel" },
      // 退出登录逻辑在 AuthContext 中已经改为清理本地缓存，无需修改
      { text: "确定退出", style: "destructive", onPress: () => logout() },
    ])
  }

  const navigateTo = (screen: string) => {
    try { navigation.navigate(screen) } catch (e) { console.warn(e) }
  }

  return (
    <View style={[$styles.container, { backgroundColor: THEME.bg, paddingHorizontal: 20 }]}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.bg} />
      
      <View style={{ paddingTop: 15, marginBottom: 15 }}>
        <Text style={styles.headerTitle} text="我的"  />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* 1. 用户信息 */}
        <UserHeader user={user} />

        {/* 2. 常用功能 */}
        <View style={styles.glassCard}>
          <MenuRow 
            icon="profile" 
            label="个人档案" 
            onPress={() => navigateTo('ProfileEdit')} 
          />
          <MenuRow 
            icon="history" 
            label="历史轨迹记录" 
            onPress={() => navigateTo('Trajectory')} 
          />
          <MenuRow 
            icon="contact" 
            label="紧急联系人" 
            isLast 
            onPress={() => navigateTo('Contacts')} 
          />
        </View>

        {/* 3. 实验室 */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle} text="实验室" />
          <View style={styles.glassCard}>
            <MenuRow
              icon="lab"
              label="深夜加班救援"
              onPress={() => {}}
              isLast={!isRescueMode}
              rightElement={
                <Switch
                  value={isRescueMode}
                  onValueChange={(val) => {
                    setIsRescueMode(val)
                    if(val) Alert.alert("🛡️", "深夜加班检测已开启")
                  }}
                  trackColor={{ false: "#4B5563", true: "#8B5CF6" }}
                  thumbColor={"#FFFFFF"}
                />
              }
            />
            {isRescueMode && (
               <TouchableOpacity onPress={() => navigateTo('RescueCheck')} style={styles.testBtn}>
                 <Text text="⚡ 立即测试弹窗" style={{ color: "#A78BFA", fontWeight: "bold" }} />
               </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. 功能演示 (Grid) */}
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionTitle} text="功能演示" />
          <View style={$styles.row}>
            {/* 跌倒演示 */}
            <TouchableOpacity 
              style={[styles.gridBtn, { marginRight: 12, borderColor: 'rgba(239,68,68,0.3)', backgroundColor: 'rgba(239,68,68,0.1)' }]} 
              onPress={() => navigateTo("FallAlert")}
            >
              <Icon icon="fall" size={32} color={null} />
              <Text text="模拟跌倒" style={{ color: "#FCA5A5", fontWeight: "bold", marginTop: 8 }} />
            </TouchableOpacity>

            {/* 失联演示 */}
            <TouchableOpacity 
              style={[styles.gridBtn, { borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.1)' }]} 
              onPress={() => navigateTo("CriticalAlert")}
            >
              <Icon icon="alert" size={32} color={null} />
              <Text text="模拟失联" style={{ color: "#FDBA74", fontWeight: "bold", marginTop: 8 }}
              numberOfLines={1}
              adjustsFontSizeToFit  />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. 退出 */}
        <TouchableOpacity style={{ alignSelf: 'center', marginTop: 40, marginBottom: 80, flexDirection: 'row', alignItems: 'center', opacity: 0.8 }} onPress={handleLogout}>
          <Icon icon="logout" size={25} color={null} />
          <View style={{ width: 6 }} />
          <Text style={{ color: THEME.textMain, fontSize: 14 }} text="退出登录" />
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

// 4. 样式定义

const styles = StyleSheet.create({
  // 文字
  headerTitle: { 
    fontSize: 28, 
    fontWeight: "bold", 
    color: THEME.textMain,
    paddingHorizontal: 15,
    paddingTop: 5,
    paddingBottom: 15,
    
  },
  sectionTitle: { 
    fontSize: 12, 
    color: THEME.textSub, 
    marginBottom: 8, 
    marginLeft: 4, 
    fontWeight: "bold" 
  },
  userName: { 
    fontSize: 22, 
    fontWeight: "bold", 
    color: THEME.textMain, 
    marginBottom: 4 
  },
  
  // 玻璃拟态卡片
  glassCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: THEME.cardBorder,
  },

  // 头像区域
  avatarBox: {
    width: 60, 
    height: 60, 
    borderRadius: 30,
    backgroundColor: "#374151",
    justifyContent: "center", 
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2, 
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarText: { 
    fontSize: 26, 
    fontWeight: "bold", 
    color: "#F9FAFB" 
  },
  userTag: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8, 
    paddingVertical: 2, 
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  userTagText: { 
    fontSize: 11, 
    color: "#6EE7B7" 
  },

  // 菜单行
  menuRow: {
    paddingVertical: 18,
    borderBottomWidth: 1, 
    borderBottomColor: THEME.divider,
  },
  menuLabel: { 
    fontSize: 16, 
    color: THEME.textMain, 
    fontWeight: "500" 
  },

  // 测试按钮
  testBtn: {
    marginTop: 12, 
    paddingTop: 12,
    borderTopWidth: 1, 
    borderTopColor: THEME.divider,
    alignItems: 'center'
  },

  // Grid 按钮
  gridBtn: {
    flex: 1, 
    height: 100,
    borderRadius: 16, 
    borderWidth: 1,
    justifyContent: 'center', 
    alignItems: 'center',
  },
})
