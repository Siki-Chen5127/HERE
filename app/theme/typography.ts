import { Platform } from "react-native"
import {
  SpaceGrotesk_300Light as spaceGroteskLight,
  SpaceGrotesk_400Regular as spaceGroteskRegular,
  SpaceGrotesk_500Medium as spaceGroteskMedium,
  SpaceGrotesk_600SemiBold as spaceGroteskSemiBold,
  SpaceGrotesk_700Bold as spaceGroteskBold,
} from "@expo-google-fonts/space-grotesk"

export const customFontsToLoad = {
  spaceGroteskLight,
  spaceGroteskRegular,
  spaceGroteskMedium,
  spaceGroteskSemiBold,
  spaceGroteskBold,
}

const fonts = {
  spaceGrotesk: {
    // Cross-platform Google font.
    light: "spaceGroteskLight",
    normal: "spaceGroteskRegular",
    medium: "spaceGroteskMedium",
    semiBold: "spaceGroteskSemiBold",
    bold: "spaceGroteskBold",
  },
  helveticaNeue: {
    // iOS only font.
    thin: "HelveticaNeue-Thin",
    light: "HelveticaNeue-Light",
    normal: "Helvetica Neue",
    medium: "HelveticaNeue-Medium",
  },
  courier: {
    // iOS only font.
    normal: "Courier",
  },
  sansSerif: {
    // Android only font.
    thin: "sans-serif-thin",
    light: "sans-serif-light",
    normal: "sans-serif",
    medium: "sans-serif-medium",
    // 补全权重，防止 TS 报错
    semiBold: "sans-serif-medium", 
    bold: "sans-serif",            
  },
  monospace: {
    // Android only font.
    normal: "monospace",
  },
}

export const typography = {
  fonts,
  // 强制 Android 使用系统默认字体，不使用 Space Grotesk
  primary: Platform.select({ 
    ios: fonts.spaceGrotesk, 
    android: fonts.sansSerif 
  }) as typeof fonts.spaceGrotesk,
  
  secondary: Platform.select({ 
    ios: fonts.helveticaNeue, 
    android: fonts.sansSerif 
  }) as typeof fonts.helveticaNeue,
  
  code: Platform.select({ 
    ios: fonts.courier, 
    android: fonts.monospace 
  }) as object,
}