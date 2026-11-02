import { ComponentType } from "react"
import {
  Pressable,
  PressableProps,
  PressableStateCallbackType,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native"

import { useAppTheme } from "@/theme/context"
import { $styles } from "@/theme/styles"
import type { ThemedStyle, ThemedStyleArray } from "@/theme/types"

import { Text, TextProps } from "./Text"

type Presets = "default" | "filled" | "reversed" | "link" // 新增 link

export interface ButtonAccessoryProps {
  style: StyleProp<any>
  pressableState: PressableStateCallbackType
  disabled?: boolean
}

export interface ButtonProps extends PressableProps {
  tx?: TextProps["tx"]
  text?: TextProps["text"]
  txOptions?: TextProps["txOptions"]
  style?: StyleProp<ViewStyle>
  pressedStyle?: StyleProp<ViewStyle>
  textStyle?: StyleProp<TextStyle>
  pressedTextStyle?: StyleProp<TextStyle>
  disabledTextStyle?: StyleProp<TextStyle>
  preset?: Presets
  RightAccessory?: ComponentType<ButtonAccessoryProps>
  LeftAccessory?: ComponentType<ButtonAccessoryProps>
  children?: React.ReactNode
  disabled?: boolean
  disabledStyle?: StyleProp<ViewStyle>
}

export function Button(props: ButtonProps) {
  const {
    tx,
    text,
    txOptions,
    style: $viewStyleOverride,
    pressedStyle: $pressedViewStyleOverride,
    textStyle: $textStyleOverride,
    pressedTextStyle: $pressedTextStyleOverride,
    disabledTextStyle: $disabledTextStyleOverride,
    children,
    RightAccessory,
    LeftAccessory,
    disabled,
    disabledStyle: $disabledViewStyleOverride,
    ...rest
  } = props

  const { themed } = useAppTheme()
  const preset: Presets = props.preset ?? "default"

  function $viewStyle({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> {
    return [
      themed($viewPresets[preset]),
      $viewStyleOverride,
      !!pressed && themed([$pressedViewPresets[preset], $pressedViewStyleOverride]),
      !!disabled && $disabledViewStyleOverride,
    ]
  }

  function $textStyle({ pressed }: PressableStateCallbackType): StyleProp<TextStyle> {
    return [
      themed($textPresets[preset]),
      $textStyleOverride,
      !!pressed && themed([$pressedTextPresets[preset], $pressedTextStyleOverride]),
      !!disabled && $disabledTextStyleOverride,
    ]
  }

  return (
    <Pressable
      style={$viewStyle}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...rest}
      disabled={disabled}
    >
      {(state: PressableStateCallbackType) => (
        <>
          {!!LeftAccessory && (
            <LeftAccessory style={$leftAccessoryStyle} pressableState={state} disabled={disabled} />
          )}
          <Text 
            tx={tx} 
            text={text} 
            txOptions={txOptions} 
            style={$textStyle(state)}
            numberOfLines={1} 
          >
            {children}
          </Text>
          {!!RightAccessory && (
            <RightAccessory
              style={$rightAccessoryStyle}
              pressableState={state}
              disabled={disabled}
            />
          )}
        </>
      )}
    </Pressable>
  )
}

const $baseViewStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  minHeight: 52, // 稍微改矮一点点，更精致
  borderRadius: 26, // 默认变成全圆角胶囊
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: spacing.sm,
  paddingHorizontal: spacing.md,
  overflow: "hidden",
})

const $baseTextStyle: ThemedStyle<TextStyle> = ({ typography }) => ({
  fontSize: 16,
  lineHeight: 20,
  fontFamily: typography.primary.medium,
  textAlign: "center",
  // --- 核心修复点：删除了 flexShrink: 1 ---
  flexShrink: 0, 
  zIndex: 2,
})

const $rightAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginStart: spacing.xs,
  zIndex: 1,
})
const $leftAccessoryStyle: ThemedStyle<ViewStyle> = ({ spacing }) => ({
  marginEnd: spacing.xs,
  zIndex: 1,
})

// --- 样式重构：适配新的 colors.ts ---
const $viewPresets: Record<Presets, ThemedStyleArray<ViewStyle>> = {
  default: [
    $styles.row,
    $baseViewStyle,
    ({ colors }) => ({
      borderWidth: 1,
      borderColor: colors.border, // 使用 colors.border
      backgroundColor: colors.surface, // 使用 colors.surface
    }),
  ],
  filled: [
    $styles.row,
    $baseViewStyle,
    ({ colors }) => ({ backgroundColor: colors.primary }), // 默认使用科技蓝
  ],
  reversed: [
    $styles.row,
    $baseViewStyle,
    ({ colors }) => ({ backgroundColor: colors.text }),
  ],
  link: [ // 新增 link 模式，无边框无背景
    $styles.row,
    $baseViewStyle,
    { backgroundColor: "transparent", borderWidth: 0, minHeight: 0, paddingVertical: 0 },
  ],
}

const $textPresets: Record<Presets, ThemedStyleArray<TextStyle>> = {
  default: [$baseTextStyle, ({ colors }) => ({ color: colors.text })],
  filled: [$baseTextStyle, ({ colors }) => ({ color: "#FFFFFF" })], // 填充模式强制白色字
  reversed: [$baseTextStyle, ({ colors }) => ({ color: colors.background })],
  link: [$baseTextStyle, ({ colors }) => ({ color: colors.primary, textDecorationLine: "underline" })],
}

const $pressedViewPresets: Record<Presets, ThemedStyle<ViewStyle>> = {
  default: ({ colors }) => ({ backgroundColor: colors.background }),
  filled: ({ colors }) => ({ opacity: 0.8 }), // 按下时调整透明度，而不是变灰
  reversed: ({ colors }) => ({ opacity: 0.8 }),
  link: ({ colors }) => ({ opacity: 0.7 }),
}

const $pressedTextPresets: Record<Presets, ThemedStyle<TextStyle>> = {
  default: () => ({ opacity: 0.9 }),
  filled: () => ({ opacity: 0.9 }),
  reversed: () => ({ opacity: 0.9 }),
  link: () => ({ opacity: 0.9 }),
}