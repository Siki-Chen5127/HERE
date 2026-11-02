import { colors } from "./colors"
import { spacing } from "./spacing"
import { timing } from "./timing"
import type { Theme } from "./types"
import { typography } from "./typography"

// 基础主题属性（间距、字体、动画在日夜间保持一致，减少认知负荷）
const baseTheme = {
  spacing,
  typography,
  timing,
}

// --- 白天主题 (Light) ---
export const lightTheme: Theme = {
  ...baseTheme,
  isDark: false,
  colors: {
    ...colors, // colors 默认导出的就是 Day 配置
  },
}

// --- 黑夜主题 (Dark) ---
// 我们通过覆盖 colors 中的关键字段来实现夜间模式
export const darkTheme: Theme = {
  ...baseTheme,
  isDark: true,
  colors: {
    ...colors,
    // 核心背景色替换
    background: colors.palette.night.bg,
    surface: colors.palette.night.card,
    
    // 文字颜色替换
    text: colors.palette.night.text,
    textDim: colors.palette.night.subText,
    
    // 边框与着色
    border: colors.palette.night.border,
    tint: colors.palette.night.tint,
    
    // 错误色背景也需要适配深色
    errorBackground: "rgba(229, 62, 62, 0.2)", // alertRed 的半透明版
  },
}