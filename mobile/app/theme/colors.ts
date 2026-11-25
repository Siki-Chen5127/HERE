// theme/colors.ts
// 核心设计理念：呼吸感、昼夜节律、科技人文 + 适老化高对比

const palette = {
  // --- 基础色板 ---
  white: "#FFFFFF",
  black: "#000000",
  
  // 科技蓝 (Day)
  techBlue: "#87acdeff", 
  // 极光蓝 (Night): 调整为更深邃的午夜色
  deepSpace: "#606fb5ff", 
  
  starlight: "#E2E8F0", 
  alertRed: "#EF4444", 
  alertBg: "#FED7D7",

  // ??Ignite????????????
  neutral100: "#F5F5F5",
  neutral200: "#E5E7EB",
  neutral300: "#D1D5DB",
  neutral400: "#9CA3AF",
  neutral500: "#6B7280",
  neutral600: "#4B5563",
  neutral800: "#1F2937",
  neutral900: "#111827",
  secondary500: "#6366F1",
  accent100: "#DBEAFE",

  // --- 适老化专属 (High Contrast) ---
  elder: {
    bg: "#F5F5F5",        // 柔和灰底，护眼
    card: "#FFFFFF",
    textMain: "#111111",  
    textSub: "#444444",   // 深灰，保证可读性
    primary: "#0066CC",   // 更深的蓝，防眩光
    success: "#008000",   // 纯正绿色 (红绿色盲友好)
    alert: "#D32F2F",     // 深红，警示感强
    border: "#000000",    // 黑色边框，界限分明
  },

  // --- 昼夜对应表 ---
  day: {
    bg: "#82c0faff", 
    card: "#FFFFFF",
    text: "#1F2937",
    subText: "#6B7280",
    border: "#E5E7EB",
    primary: "#5a91deff",
    tint: "#0EA5E9", 
  },
  night: {
    bg: "#313547ff", 
    card: "#5b7092ff", 
    text: "#F1F5F9", 
    subText: "#94A3B8", 
    border: "#4973aeff",
    primary: "#38BDF8", 
    tint: "#818CF8",    
  },
}

export const colors = {
  palette,
  transparent: "rgba(0, 0, 0, 0)",
  background: palette.day.bg,
  surface: palette.day.card,
  
  text: palette.day.text,
  textDim: palette.day.subText,
  
  border: palette.day.border,
  tint: palette.day.tint,
  primary: palette.day.primary,
  warning: "#F59E0B",
  separator: palette.day.border,
  
  error: palette.alertRed,
  errorBackground: palette.alertBg,
  
  overlay20: "rgba(15, 23, 42, 0.2)",
  overlay50: "rgba(15, 23, 42, 0.5)",
} as const