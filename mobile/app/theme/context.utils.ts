import type { Theme } from "./types"

const systemui = require("expo-system-ui")

let themeBackground = "#FFFFFF"
const backgroundOverrides: { color: string }[] = []

const applyBackground = (color: string) => {
  if (systemui) {
    void systemui.setBackgroundColorAsync(color).catch(() => {})
  }
}

/**
 * Set the system UI background color to the given color. This is only available if the app has
 * installed expo-system-ui.
 *
 * @param color The color to set the system UI background to
 */
export const setSystemUIBackgroundColor = (color: string) => {
  themeBackground = color
  applyBackground(backgroundOverrides.at(-1)?.color ?? color)
}

/** Screen overrides take priority over timed theme updates until focus is lost. */
export const pushSystemUIBackgroundColor = (color: string) => {
  const entry = { color }
  backgroundOverrides.push(entry)
  applyBackground(color)

  return () => {
    const index = backgroundOverrides.indexOf(entry)
    if (index < 0) return
    backgroundOverrides.splice(index, 1)
    applyBackground(backgroundOverrides.at(-1)?.color ?? themeBackground)
  }
}

/**
 * Set the app's native background color to match the theme.
 * This is only available if the app has installed expo-system-ui
 *
 * @param theme The theme object to use for the background color
 */
export const setImperativeTheming = (theme: Theme) => {
  setSystemUIBackgroundColor(theme.colors.background)
}
