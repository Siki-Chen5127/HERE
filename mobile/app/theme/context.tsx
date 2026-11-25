import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react"
import { StyleProp, useColorScheme, AppState } from "react-native"
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavDefaultTheme,
  Theme as NavTheme,
} from "@react-navigation/native"
import { useMMKVString } from "react-native-mmkv"

import { storage } from "@/utils/storage"
import { setImperativeTheming } from "./context.utils"
import { darkTheme, lightTheme } from "./theme"
import type {
  AllowedStylesT,
  ImmutableThemeContextModeT,
  Theme,
  ThemeContextModeT,
  ThemedFnT,
  ThemedStyle,
} from "./types"

export type ThemeContextType = {
  navigationTheme: NavTheme
  setThemeContextOverride: (newTheme: ThemeContextModeT) => void
  theme: Theme
  themeContext: ImmutableThemeContextModeT
  themed: ThemedFnT
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

export interface ThemeProviderProps {
  initialContext?: ThemeContextModeT
}

export const ThemeProvider: FC<PropsWithChildren<ThemeProviderProps>> = ({
  children,
  initialContext,
}) => {
  const systemColorScheme = useColorScheme()
  const [themeScheme, setThemeScheme] = useMMKVString("ignite.themeScheme", storage)
  
  // --- 新增：时间计算逻辑 ---
  const calculateTimeBasedTheme = (): "light" | "dark" => {
    const hour = new Date().getHours()
    const isDayTime = hour >= 6 && hour < 18
    return isDayTime ? "light" : "dark"
  }

  const [timeBasedTheme, setTimeBasedTheme] = useState<"light" | "dark">(calculateTimeBasedTheme())

  useEffect(() => {
    const checkTime = () => {
      const newTheme = calculateTimeBasedTheme()
      if (newTheme !== timeBasedTheme) {
        setTimeBasedTheme(newTheme)
        // TODO: 这里是一个绝佳的扩展点
        // 如果是从 light 变成 dark，可以弹出一个温柔的 Toast: "天黑了，注意休息"
      }
    }

    // 初始检查
    checkTime()

    // 设置定时器 (60秒检查一次)
    const interval = setInterval(checkTime, 60000)

    // 监听 App 状态变化 (从后台回来时立即更新，避免等到下一分钟)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkTime()
      }
    })

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [timeBasedTheme])
  // -----------------------

  const setThemeContextOverride = useCallback(
    (newTheme: ThemeContextModeT) => {
      setThemeScheme(newTheme)
    },
    [setThemeScheme],
  )

  /**
   * 核心优先级逻辑：
   * 1. initialContext (强制传入)
   * 2. themeScheme (用户手动设置)
   * 3. timeBasedTheme (时间自动) -> 这里替换了原本的 systemColorScheme
   * 4. systemColorScheme (最后兜底)
   */
  const themeContext: ImmutableThemeContextModeT = useMemo(() => {
    // 如果用户没有手动设置 (themeScheme 为 undefined)，则使用时间主题
    const target = initialContext || themeScheme || timeBasedTheme
    return target === "dark" ? "dark" : "light"
  }, [initialContext, themeScheme, timeBasedTheme])

  const navigationTheme: NavTheme = useMemo(() => {
    return themeContext === "dark" ? NavDarkTheme : NavDefaultTheme
  }, [themeContext])

  const theme: Theme = useMemo(() => {
    return themeContext === "dark" ? darkTheme : lightTheme
  }, [themeContext])

  useEffect(() => {
    setImperativeTheming(theme)
  }, [theme])

  const themed = useCallback(
    <T,>(styleOrStyleFn: AllowedStylesT<T>) => {
      const flatStyles = [styleOrStyleFn].flat(3) as (ThemedStyle<T> | StyleProp<T>)[]
      const stylesArray = flatStyles.map((f) => {
        if (typeof f === "function") {
          return (f as ThemedStyle<T>)(theme)
        } else {
          return f
        }
      })
      return Object.assign({}, ...stylesArray) as T
    },
    [theme],
  )

  const value = {
    navigationTheme,
    theme,
    themeContext,
    setThemeContextOverride,
    themed,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useAppTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useAppTheme must be used within an ThemeProvider")
  }
  return context
}