import { ComponentProps, FC, useCallback, useState } from "react"
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch, Image } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Feather from "@expo/vector-icons/Feather"
import { useFocusEffect } from "@react-navigation/native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { usersRepository } from "@/services/database/repositories"
import { spacing } from "@/theme/spacing"
import { $styles } from "@/theme/styles"
import { useScreenChrome } from "@/utils/useScreenChrome"

import { homeColors as C } from "./MainScreen/components/homeAppearance"

// 1. 页面配置

// Match the home screen's light frosted surface without changing the global theme.
const THEME = {
  bg: C.background,
  cardBg: "rgba(255,255,255,0.46)",
  cardBorder: "rgba(255,255,255,0.88)",
  textMain: C.text,
  textSub: C.secondary,
  divider: C.line,
  avatarBg: "#718E71",
  tagBg: "rgba(110,145,107,0.1)",
  track: "#D4DECF",
  white: "#FFFFFF",
  demoRed: "rgba(167,57,57,0.06)",
  demoRedBorder: "rgba(167,57,57,0.16)",
  demoAmber: "rgba(142,102,46,0.06)",
  demoAmberBorder: "rgba(142,102,46,0.16)",
  amber: "#85622F",
}

const PROFILE_ICONS = {
  profile: "user",
  history: "map",
  contact: "users",
  lab: "moon",
  fall: "activity",
  alert: "alert-triangle",
  logout: "log-out",
  caretRight: "chevron-right",
} as const satisfies Record<string, ComponentProps<typeof Feather>["name"]>
type IconTypes = keyof typeof PROFILE_ICONS
const Icon = ({ icon, size = 24 }: { icon: IconTypes; size?: number; color?: string | null }) => (
  <Feather name={PROFILE_ICONS[icon]} size={size} color={C.primary} accessible={false} />
)

/**
 * 🔹 用户头部卡片
 */
const UserHeader = ({ user }: { user: any }) => {
  return (
    <View style={[styles.glassCard, $styles.row]}>
      {/* 头像 */}
      <View style={styles.avatarBox}>
        <Text style={styles.avatarText} text={user?.avatarChar || "?"} />
      </View>

      {/* 信息 */}
      <View style={styles.userInfo}>
        <Text style={styles.userName} text={user?.displayName || "未登录"} numberOfLines={2} />
        <View style={styles.userTag}>
          <Text style={styles.userTagText} text={user?.mobile || "暂无手机号"} />
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
      style={[styles.menuRow, $styles.rowBetween, isLast && styles.lastRow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuLeft}>
        <View style={styles.iconMargin}>
          <Icon icon={icon} size={24} color={null} />
        </View>
        <Text style={styles.menuLabel} text={label} />
      </View>

      <View>{rightElement || <Icon icon="caretRight" size={20} color={null} />}</View>
    </TouchableOpacity>
  )
}

export const SettingsScreen: FC<any> = ({ navigation }) => {
  const { logout, currentUser: authUser } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [isRescueMode, setIsRescueMode] = useState(false)

  const insets = useSafeAreaInsets()
  useScreenChrome(THEME.bg)

  useFocusEffect(
    useCallback(() => {
      if (!authUser?.id) {
        setUser(null)
        return
      }
      try {
        // 🟢 4. 从本地 SQLite 获取当前用户信息
        const currentUser = usersRepository.getActiveUser()
        if (currentUser) {
          const candidate = (currentUser.realName || authUser?.name || "").trim()
          const mobile = currentUser.phone
          const displayName = candidate && candidate !== mobile ? candidate : "同学"

          setUser({
            displayName,
            mobile: /^\d{11}$/.test(mobile)
              ? `${mobile.slice(0, 3)}****${mobile.slice(-4)}`
              : mobile
                ? "已绑定手机号"
                : "暂无手机号",
            avatarChar: Array.from(displayName)[0] || "同",
          })
        } else setUser(null)
      } catch (error) {
        console.error("读取本地用户信息失败", error)
      }
    }, [authUser?.id, authUser?.name]),
  )

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要离开 HERE 吗？", [
      { text: "我再想想", style: "cancel" },
      // 退出登录逻辑在 AuthContext 中已经改为清理本地缓存，无需修改
      { text: "确定退出", style: "destructive", onPress: () => logout() },
    ])
  }

  const navigateTo = (screen: string) => {
    try {
      navigation.navigate(screen)
    } catch (e) {
      console.warn(e)
    }
  }

  return (
    <View style={styles.screen}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={require("../../assets/images/home-ambient.png")}
          resizeMode="cover"
          style={styles.backdrop}
        />
        <LinearGradient
          colors={["rgba(248,247,233,0.18)", "rgba(242,245,232,0.7)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
      >
        <Text style={styles.headerTitle} text="我的" />

        {/* 1. 用户信息 */}
        <UserHeader user={user} />

        {/* 2. 常用功能 */}
        <View style={[styles.glassCard, styles.commonMenu]}>
          <MenuRow icon="profile" label="个人档案" onPress={() => navigateTo("ProfileEdit")} />
          <MenuRow icon="history" label="历史轨迹记录" onPress={() => navigateTo("Trajectory")} />
          <MenuRow
            icon="contact"
            label="紧急联系人"
            isLast
            onPress={() => navigateTo("Contacts")}
          />
        </View>

        {/* 3. 实验室 */}
        <View style={styles.sectionGroup}>
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
                    if (val)
                      Alert.alert("演示模式", "已打开提醒演示入口，可点击下方按钮查看提醒页面。")
                  }}
                  accessibilityLabel="深夜加班救援演示"
                  trackColor={{ false: THEME.track, true: C.primary }}
                  thumbColor={THEME.white}
                />
              }
            />
            {isRescueMode && (
              <TouchableOpacity onPress={() => navigateTo("RescueCheck")} style={styles.testBtn}>
                <Text text="查看提醒演示" style={styles.testText} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 4. 功能演示 (Grid) */}
        <View style={styles.sectionGroup}>
          <Text style={styles.sectionTitle} text="功能演示" />
          <View style={$styles.row}>
            {/* 跌倒演示 */}
            <TouchableOpacity
              style={[styles.gridBtn, styles.fallDemo]}
              onPress={() => navigateTo("FallAlert")}
            >
              <Icon icon="fall" size={32} color={null} />
              <Text text="模拟跌倒" style={styles.fallText} />
            </TouchableOpacity>

            {/* 失联演示 */}
            <TouchableOpacity
              style={[styles.gridBtn, styles.absenceDemo]}
              onPress={() => navigateTo("CriticalAlert")}
            >
              <Icon icon="alert" size={32} color={null} />
              <Text
                text="模拟失联"
                style={styles.absenceText}
                numberOfLines={1}
                adjustsFontSizeToFit
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 5. 退出 */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="退出登录"
        >
          <Icon icon="logout" size={25} color={null} />
          <View style={styles.logoutGap} />
          <Text style={styles.logoutText} text="退出登录" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

// 4. 样式定义

const styles = StyleSheet.create({
  absenceDemo: { backgroundColor: THEME.demoAmber, borderColor: THEME.demoAmberBorder },
  absenceText: {
    color: THEME.amber,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    marginTop: 8,
  },
  avatarBox: {
    alignItems: "center",
    backgroundColor: THEME.avatarBg,
    borderColor: THEME.cardBorder,
    borderRadius: 30,
    borderWidth: 2,
    height: 60,
    justifyContent: "center",
    marginRight: 16,
    width: 60,
  },
  avatarText: {
    color: THEME.white,
    fontSize: 26,
    fontWeight: "bold",
    lineHeight: 36,
  },
  backdrop: { height: "100%", opacity: 0.8, width: "100%" },
  commonMenu: { marginTop: 18 },
  content: { paddingBottom: 32, paddingHorizontal: 22 },
  fallDemo: { backgroundColor: THEME.demoRed, borderColor: THEME.demoRedBorder, marginRight: 12 },
  fallText: { color: C.danger, fontSize: 14, fontWeight: "500", lineHeight: 22, marginTop: 8 },
  glassCard: {
    backgroundColor: THEME.cardBg,
    borderColor: THEME.cardBorder,
    borderRadius: 24,
    borderWidth: 1,
    padding: spacing.md,
  },
  gridBtn: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  headerTitle: {
    color: THEME.textMain,
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 40,
    marginBottom: 22,
  },
  iconMargin: { marginRight: 12 },
  lastRow: { borderBottomWidth: 0 },
  logoutButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  logoutGap: { width: 6 },
  logoutText: { color: C.secondary, fontSize: 14, lineHeight: 22 },
  menuLabel: {
    color: THEME.textMain,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  menuLeft: { alignItems: "center", flex: 1, flexDirection: "row", marginRight: 12 },
  menuRow: {
    borderBottomColor: THEME.divider,
    borderBottomWidth: 1,
    paddingVertical: 18,
  },
  screen: { backgroundColor: THEME.bg, flex: 1 },
  sectionGroup: { marginTop: 24 },
  sectionTitle: {
    color: THEME.textSub,
    fontSize: 13,
    fontWeight: "bold",
    lineHeight: 21,
    marginBottom: 8,
    marginLeft: 4,
  },
  testBtn: {
    alignItems: "center",
    borderTopColor: THEME.divider,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  testText: { color: C.primary, fontSize: 14, fontWeight: "500", lineHeight: 22 },
  userInfo: { flex: 1 },
  userName: {
    color: THEME.textMain,
    fontSize: 22,
    fontWeight: "bold",
    lineHeight: 32,
    marginBottom: 4,
  },
  userTag: {
    alignSelf: "flex-start",
    backgroundColor: THEME.tagBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  userTagText: {
    color: C.secondary,
    fontSize: 11,
    lineHeight: 18,
  },
})
