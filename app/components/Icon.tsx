import React, { ComponentType } from "react"
import {
  Image,
  ImageStyle,
  StyleProp,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  ViewStyle,
} from "react-native"

import { useAppTheme } from "@/theme/context"

// --- 1. 图标注册表 (确保 assets/icons 目录下有这些 png 文件) ---
export const iconRegistry = {
  back: require("../../assets/icons/back.png"),
  bell: require("../../assets/icons/bell.png"),
  caretLeft: require("../../assets/icons/caretLeft.png"),
  caretRight: require("../../assets/icons/caretRight.png"),
  components: require("../../assets/icons/components.png"), 
  settings: require("../../assets/icons/settings.png"),
  view: require("../../assets/icons/view.png"),
  hidden: require("../../assets/icons/view.png"),
  location: require("../../assets/icons/location.png"),
  check: require("../../assets/icons/check.png"),
  mood: require("../../assets/icons/mood.png"),
  sos: require("../../assets/icons/sos.png"),
  navigation: require("../../assets/icons/navigation.png"),
  home: require("../../assets/icons/home.png"),
  chart: require("../../assets/icons/chart.png"),
  user: require("../../assets/icons/user.png"),
  radar: require("../../assets/icons/radar.png"),
  send: require("../../assets/icons/send.png"),
  write: require("../../assets/icons/write.png"),
  loading: require("../../assets/icons/loading.png"),
  profile: require("../../assets/icons/profile.png"),     
  history: require("../../assets/icons/history.png"),     
  contact: require("../../assets/icons/contact.png"),   
  lab:     require("../../assets/icons/lab.png"),         
  fall:    require("../../assets/icons/fall.png"),       
  alert:   require("../../assets/icons/alert.png"),      
  logout:  require("../../assets/icons/logout.png"),    
}

export type IconTypes = keyof typeof iconRegistry

type BaseIconProps = {
  /**
   * The name of the icon
   */
  icon: IconTypes

  /**
   * An optional tint color for the icon
   * 🌟 修改点：允许传入 null 以显示原图
   */
  color?: string | null

  /**
   * An optional size for the icon. If not provided, the icon will be sized to the icon's resolution.
   */
  size?: number

  /**
   * Style overrides for the icon image
   */
  style?: StyleProp<ImageStyle>

  /**
   * Style overrides for the icon container
   */
  containerStyle?: StyleProp<ViewStyle>

  /**
   * An optional function to be called when the icon is pressed
   */
  onPress?: TouchableOpacityProps["onPress"]
}

type PressableIconProps = Omit<TouchableOpacityProps, "style"> & BaseIconProps
type IconProps = Omit<ViewProps, "style"> & BaseIconProps

/**
 * A component to render a registered icon.
 * It is wrapped in a <TouchableOpacity />
 */
export function PressableIcon(props: PressableIconProps) {
  const {
    icon,
    color,
    size,
    style: $imageStyleOverride,
    containerStyle: $containerStyleOverride,
    ...pressableProps
  } = props

  const { theme } = useAppTheme()

  const $imageStyle: StyleProp<ImageStyle> = [
    $imageStyleBase,
    // 🌟 核心修复：只有当 color 不为 null 时，才应用 tintColor
    // 如果 color 为 null，这一行会变成 false，React Native 会忽略它，从而显示彩色原图
    color !== null && { tintColor: color ?? theme.colors.text },
    size !== undefined && { width: size, height: size },
    $imageStyleOverride,
  ]

  return (
    <TouchableOpacity accessibilityRole="image" {...pressableProps} style={$containerStyleOverride}>
      <Image style={$imageStyle} source={iconRegistry[icon]} />
    </TouchableOpacity>
  )
}

/**
 * A component to render a registered icon.
 * It is wrapped in a <View />
 */
export function Icon(props: IconProps) {
  const {
    icon,
    color,
    size,
    style: $imageStyleOverride,
    containerStyle: $containerStyleOverride,
    ...viewProps
  } = props

  const { theme } = useAppTheme()

  const $imageStyle: StyleProp<ImageStyle> = [
    $imageStyleBase,
    // 🌟 核心修复：同上，支持 null 值跳过染色
    color !== null && { tintColor: color ?? theme.colors.text },
    size !== undefined && { width: size, height: size },
    $imageStyleOverride,
  ]

  return (
    <View accessibilityRole="image" {...viewProps} style={$containerStyleOverride}>
      <Image style={$imageStyle} source={iconRegistry[icon]} />
    </View>
  )
}

const $imageStyleBase: ImageStyle = {
  resizeMode: "contain",
}