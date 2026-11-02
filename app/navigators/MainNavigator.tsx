import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import React from "react"
import { View } from "react-native" 
import { useSafeAreaInsets } from "react-native-safe-area-context"

// --- 1. 导入组件与页面 ---
import { Icon } from "@/components/Icon" 
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
  SosAlert: undefined 
  RescueCheck: undefined
  FallAlert: undefined
  CriticalAlert: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createNativeStackNavigator<MainStackParamList>()

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

  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#10B981', 
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ color, size }) => {
          const iconName = getTabIcon(route.name, false)
          return <Icon icon={iconName} size={24} color={null} />
        },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0, 
          height: 64 + insets.bottom, 
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        }
      })}
    >
      <Tab.Screen 
        name="Main" 
        component={MainScreen} 
        options={{ tabBarLabel: "首页" }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreen} 
        options={{ tabBarLabel: "统计" }}
      />
      <Tab.Screen 
        name="Settings"  
        component={SettingsScreen} 
        options={{ tabBarLabel: "我的" }}
      />
    </Tab.Navigator>
  )
}

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* 1. 底部 Tab 作为主入口 */}
      <Stack.Screen name="Tabs" component={BottomTabs} />
      
      {/* 2. 业务功能页面 (从 Tabs 跳转出来的二级页面) */}
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="ContactEdit" component={ContactEditScreen} />
      <Stack.Screen name="Trajectory" component={TrajectoryScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="AiChat" component={AiChatScreen} />
      <Stack.Screen name="Geofence" component={GeofenceScreen} />
      <Stack.Screen name="Hardware" component={HardwareScreen} />
      <Stack.Screen name="FallAlert" component={FallAlertScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="CriticalAlert" component={CriticalAlertScreen} options={{ presentation: "modal" }} />
      
      {/* 3. 告警与紧急页面 (通常使用 Modal 呈现) */}
      <Stack.Screen 
        name="SosAlert" 
        component={SosAlertScreen} 
        options={{ presentation: "transparentModal", animation: "fade" }} 
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