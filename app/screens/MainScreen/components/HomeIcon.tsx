import React from "react"
import Feather from "@expo/vector-icons/Feather"

import { homeColors } from "./homeAppearance"

// 左边沿用页面已有名称，右边对应线性图标。
const iconNames = {
  user: "user",
  write: "message-circle",
  caretRight: "chevron-right",
  contact: "book-open",
  mood: "heart",
  location: "map-pin",
  navigation: "navigation",
  check: "check-circle",
  alert: "alert-triangle",
  home: "home",
  chart: "bar-chart-2",
} as const

export type IconTypes = keyof typeof iconNames

interface HomeIconProps {
  icon: IconTypes
  size?: number
  color?: string | null
}

export function HomeIcon({
  icon,
  size = 24,
  color,
}: HomeIconProps) {
  return (
    <Feather
      name={iconNames[icon]}
      size={size}
      color={color ?? homeColors.text}
      accessible={false}
    />
  )
}