import { ViewStyle, Platform } from "react-native"
import { colors } from "./colors"
import { spacing } from "./spacing"

/* 全局通用样式库 
  设计目标：精致、轻量、高科技感
*/
export const $styles = {
  // 布局基础
  row: { flexDirection: "row", alignItems: "center" } as ViewStyle,
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } as ViewStyle,
  flex1: { flex: 1 } as ViewStyle,
  flexCenter: { flex: 1, justifyContent: "center", alignItems: "center" } as ViewStyle,
  flexWrap: { flexWrap: "wrap" } as ViewStyle,

  // 页面容器 (统一内边距)
  container: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background, // 引用 colors.ts
  } as ViewStyle,

  // 卡片效果 (精致感的核心)
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16, // 更大的圆角，更有亲和力
    padding: spacing.md,
    marginBottom: spacing.md,
    // 高级阴影 (iOS/Android 适配)
    ...Platform.select({
      ios: {
        shadowColor: colors.palette.deepSpace, // 使用深蓝阴影，不显脏
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08, // 淡淡的浮起感
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
        shadowColor: colors.palette.deepSpace,
      },
    }),
  } as ViewStyle,

  // 浮动按钮阴影 (FAB)
  toggleInner: {
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  shadowFloating: {
    ...Platform.select({
      ios: {
        shadowColor: colors.palette.techBlue, // 按钮发光感
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
        shadowColor: colors.palette.techBlue,
      },
    }),
  } as ViewStyle,
}