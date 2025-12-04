import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import React from "react"
import { Text, View } from "react-native" 
import { useSafeAreaInsets } from "react-native-safe-area-context"

// --- 1. 导入真实页面 ---
import { MainScreen } from "@/screens/MainScreen"
import { SettingsScreen } from "@/screens/SettingsScreen"
import { ContactsScreen } from "@/screens/ContactsScreen"
import { ContactEditScreen } from "@/screens/ContactEditScreen"
import { SosAlertScreen } from "@/screens/SosAlertScreen" 
import { ProfileEditScreen } from "@/screens/ProfileEditScreen"
import { AiChatScreen } from "@/screens/AiChatScreen"
import { TrajectoryScreen } from "@/screens/TrajectoryScreen"
import { RescueCheckScreen } from "@/screens/RescueCheckScreen"
import{ StatisticsScreen } from "@/screens/StatisticsScreen"

const HardwareScreen = () => <View><Text>Hardware</Text></View>
const FallAlertScreen = () => <View><Text>Fall Alert</Text></View>
const CriticalAlertScreen = () => <View><Text>Critical Alert</Text></View>

// --- 类型定义 ---
export type TabParamList = {
  Main: undefined
  Statistics: undefined
  Settings: undefined 
}

export type MainStackParamList = {
  Tabs: undefined 
  Contacts: undefined
  ContactEdit: { contactId?: string; initialName?: string; initialPhone?: string } | undefined
  Hardware: undefined
  Trajectory: undefined
  ProfileEdit: undefined
  AiChat: undefined
  SosAlert: undefined 
  // 新增 RescueCheck 路由定义
  RescueCheck: undefined
  FallAlert: undefined
  CriticalAlert: undefined
}

const Tab = createBottomTabNavigator<TabParamList>()
const Stack = createNativeStackNavigator<MainStackParamList>()

function BottomTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: '#10B981', 
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0, 
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom,
          paddingTop: 5,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginTop: -2,
        }
      }}
    >
      <Tab.Screen 
        name="Main" 
        component={MainScreen} 
        options={{ 
          tabBarLabel: "首页",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color: color }}>🏠</Text>
          )
        }}
      />
      <Tab.Screen 
        name="Statistics" 
        component={StatisticsScreen} 
        options={{ 
          tabBarLabel: "统计",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color: color }}>📊</Text>
          )
        }}
      />
      <Tab.Screen 
        name="Settings"  
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: "我的",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color: color }}>👤</Text>
          )
        }}
      />
    </Tab.Navigator>
  )
}

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={BottomTabs} />
      
      {/* 注册真实页面 */}
      <Stack.Screen name="Contacts" component={ContactsScreen} />
      <Stack.Screen name="ContactEdit" component={ContactEditScreen} />
      <Stack.Screen name="SosAlert" component={SosAlertScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="AiChat" component={AiChatScreen} />
      <Stack.Screen name="Trajectory" component={TrajectoryScreen} />
      
      {/* 新增：注册救援检测页 (强制全屏 Modal) */}
      <Stack.Screen 
        name="RescueCheck" 
        component={RescueCheckScreen} 
        options={{ 
          presentation: "fullScreenModal", 
          gestureEnabled: false, // 禁止手势关闭，强制点按钮
          headerShown: false
        }} 
      />
      
      {/* 其他页面占位 */}
      <Stack.Screen name="Hardware" component={HardwareScreen} />
      <Stack.Screen name="FallAlert" component={FallAlertScreen} options={{ presentation: "modal" }} />
      <Stack.Screen name="CriticalAlert" component={CriticalAlertScreen} options={{ presentation: "modal" }} />
    </Stack.Navigator>
  )
}