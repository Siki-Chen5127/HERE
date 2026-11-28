import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import React from "react"
import { Image, Platform, StyleSheet, Text, View } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useSafeAreaInsets } from "react-native-safe-area-context"

// --- 1. 导入组件与页面 ---
import { HomeIcon as Icon } from "@/screens/MainScreen/components/HomeIcon"
import { MainScreen } from "@/screens"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { ContactsScreen } from "@/screens/ContactsScreen"
import { ContactEditScreen } from "@/screens/ContactEditScreen"
import { SosAlertScreen } from "@/screens/SosAlertScreen" 
import { ProfileEditScreen } from "@/screens/ProfileEditScreen"
import { AiChatScreen } from "@/screens/AiChatScreen"
import { TrajectoryScreen } from "@/screens/TrajectoryScreen" 
import { RescueCheckScreen } from "@/screens/RescueCheckScreen"
import { StatisticsScreen } from "@/screens/StatisticsScreen"
import { GeofenceScreen } from "@/screens/MainScreen/GeofenceScreen"
import { FallAlertScreen } from "@/screens/FallAlertScreen"
import { CriticalAlertScreen } from "@/screens/CriticalAlertScreen"
import { SupportScreen } from "@/screens/SupportScreen"
import { homeColors } from "@/screens/MainScreen/components/homeAppearance"
import { RouteMotion } from "@/components/RouteMotion"
import { useReducedMotion } from "@/utils/useReducedMotion"
import { useViewport } from "@/utils/useViewport"


// 占位页面
const HardwareScreen = () => <View />



// --- 2. 类型定义 (保持规范) ---
export type TabParamList = {
  Main: undefined
  Statistics: undefined
  Settings: undefined 
}

export type MainStackParamList = {
  Tabs: undefined 
  Contacts: undefined
  Geofence: { elderId: string; elderName: string }
  ContactEdit: { contactId?: string; initialName?: string; initialPhone?: string } | undefined
  Hardware: undefined
  Trajectory: undefined
  ProfileEdit: undefined
  AiChat: undefined
  Support: { section?: "request" | "progress" | "wellbeing" | "consultation" } | undefined
  SosAlert: undefined 
  RescueCheck: { rehearsal?: boolean } | undefined
  FallAlert: undefined
  CriticalAlert: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createNativeStackNavigator<MainStackParamList>()

const tabLabels: Record<keyof TabParamList, string> = {
  Main: "关怀",
  Statistics: "统计",
  Settings: "我的",
}

const getTabIcon = (routeName: keyof TabParamList, focused: boolean) => {
  switch (routeName) {
    case "Main":
      return "home" 
    case "Statistics":
      return "chart" 
    case "Settings":
      return "user" 
    default:
      return "user"
  }
}

function BottomTabs() {
  const insets = useSafeAreaInsets()
  const { width, fontScale } = useViewport()
  const desktop = Platform.OS === "web" && width >= 1000
  const reducedMotion = useReducedMotion()

  return (
    <View style={styles.tabsCanvas}>
    <Tab.Navigator
      screenLayout={({ children }) => <RouteMotion>{children}</RouteMotion>}
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: styles.tabsCanvas,
        tabBarActiveTintColor: homeColors.primary,
        tabBarInactiveTintColor: '#506356',
        tabBarPosition: desktop ? "left" : "bottom",
        tabBarVariant: desktop ? "material" : "uikit",
        tabBarLabelPosition: desktop ? "beside-icon" : "below-icon",
        title: tabLabels[route.name],
        tabBarAccessibilityLabel: tabLabels[route.name],
        tabBarLabel: ({ color, position }) => (
          <Text style={[styles.tabLabel, position === "beside-icon" && styles.tabLabelBeside, { color }]}>
            {tabLabels[route.name]}
          </Text>
        ),
        animation: reducedMotion || Platform.OS === "web" ? "none" : "fade",
        tabBarIcon: ({ color, size }) => {
          const iconName = getTabIcon(route.name, false)
          return <Icon icon={iconName} size={24} color={color} />
        },
        tabBarBackground: () => (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.glassTabBackground]}>
            <Image source={require("../../assets/images/home-ambient.png")} style={[StyleSheet.absoluteFill, { width: "100%", height: "100%", opacity: 0.4 }]} />
            <LinearGradient colors={["rgba(255,255,255,0.78)", "rgba(244,247,235,0.72)"]} style={StyleSheet.absoluteFill} />
          </View>
        ),
        tabBarStyle: desktop ? {
          width: 202,
          minWidth: 202,
          paddingHorizontal: 13,
          paddingTop: 36,
          backgroundColor: "#f7f6eb",
          borderRightColor: "#d5ddcc",
        } : {
          backgroundColor: "transparent",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.9)",
          overflow: "visible",
          height: 72 + insets.bottom + Math.ceil(Math.max(0, fontScale - 1) * 20),
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 0,
        },
      })}
    >
      <Tab.Screen 
        name="Main" 
        component={MainScreen} 
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreen} 
      />
      <Tab.Screen 
        name="Settings"  
        component={SettingsScreen} 
      />
    </Tab.Navigator>
    </View>
  )
}

export function MainNavigator() {
  const reducedMotion = useReducedMotion()
  return (
    <Stack.Navigator
      screenLayout={({ children, route }) => route.name === "Tabs" ? children : <RouteMotion>{children}</RouteMotion>}
      screenOptions={{ headerShown: false, animation: reducedMotion ? "none" : "fade" }}
    >
      {/* 1. 底部 Tab 作为主入口 */}
      <Stack.Screen name="Tabs" component={BottomTabs} options={{ contentStyle: styles.tabsCanvas }} />
      
      {/* 2. 业务功能页面 (从 Tabs 跳转出来的二级页面) */}
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="ContactEdit" component={ContactEditScreen} />
      <Stack.Screen name="Trajectory" component={TrajectoryScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="AiChat" component={AiChatScreen} />
      <Stack.Screen name="Support" component={SupportScreen} />
      <Stack.Screen name="Geofence" component={GeofenceScreen} />
      <Stack.Screen name="Hardware" component={HardwareScreen} />
      <Stack.Screen name="FallAlert" component={FallAlertScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="CriticalAlert" component={CriticalAlertScreen} options={{ presentation: "modal" }} />
      
      {/* 3. 告警与紧急页面 (通常使用 Modal 呈现) */}
      <Stack.Screen 
        name="SosAlert" 
        component={SosAlertScreen} 
        options={{ presentation: "transparentModal", animation: reducedMotion ? "none" : "fade" }} 
      />
      <Stack.Screen 
        name="RescueCheck" 
        component={RescueCheckScreen} 
        options={{ 
          presentation: "fullScreenModal", 
          gestureEnabled: false, 
        }} 
      />
      
      
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 13,
    lineHeight: 22,
    fontWeight: "600",
    flexShrink: 0,
    textAlign: "center",
  },
  tabLabelBeside: {
    marginStart: 12,
    textAlign: "left",
  },
  glassTabBackground: {
    backgroundColor: homeColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  tabsCanvas: {
    backgroundColor: homeColors.background,
    flex: 1,
    minWidth: 0,
  },
})
