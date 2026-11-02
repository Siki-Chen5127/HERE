import "@expo/metro-runtime" // this is for fast refresh on web w/o expo-router
import { registerRootComponent } from "expo"

import { App } from "@/app"
import { initializeAMapSdk } from "@/services/amap"

// 高德地图要求在任何 MapView 挂载前完成 Key 与隐私状态初始化。
initializeAMapSdk()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App)
