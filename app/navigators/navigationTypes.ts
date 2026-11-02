import { ComponentProps } from "react"
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs"
import {
  CompositeScreenProps,
  NavigationContainer,
  NavigatorScreenParams,
} from "@react-navigation/native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"

// 
export type MainBottomTabParamList = {
  Main: undefined
  Statistics: undefined
  Settings: undefined
}
export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainBottomTabParamList>
  Contacts: undefined
  ContactEdit: undefined
  Hardware: undefined
  Trajectory: undefined
  ProfileEdit: undefined
  AiChat: undefined
  SosAlert: undefined
  FallAlert: undefined
  CriticalAlert: undefined
}
export type AppStackParamList = {
  // --- “未认证”区域 ---
  Login: undefined

  // --- “已认证”区域 ---
  PersonaSelect: undefined
  Main: NavigatorScreenParams<MainStackParamList>
}
// -----------------------------------------------------------------

// (4. 保持不变)
export type AppStackScreenProps<T extends keyof AppStackParamList> = NativeStackScreenProps<
  AppStackParamList,
  T
>
export type MainStackScreenProps<T extends keyof MainStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<MainStackParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>
export type MainBottomTabScreenProps<T extends keyof MainBottomTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainBottomTabParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>
export interface NavigationProps
  extends Partial<ComponentProps<typeof NavigationContainer<AppStackParamList>>> {}