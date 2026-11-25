import { useCallback } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { SystemBars, type SystemBarStyle } from "react-native-edge-to-edge"

import { pushSystemUIBackgroundColor } from "@/theme/context.utils"

/** Apply chrome only while this screen is focused; retained tabs must not override it. */
export function useScreenChrome(backgroundColor: string, style: SystemBarStyle = "dark") {
  useFocusEffect(
    useCallback(() => {
      const entry = SystemBars.pushStackEntry({ style })
      const releaseBackground = pushSystemUIBackgroundColor(backgroundColor)

      return () => {
        SystemBars.popStackEntry(entry)
        releaseBackground()
      }
    }, [backgroundColor, style]),
  )
}
