import React from "react"
import { View, StyleSheet } from "react-native"
import { Text } from "@/components/Text"
import { HomeIcon as Icon } from "./HomeIcon"
import { homeColors as C } from "./homeAppearance"
import { SoftPressable } from "./SoftPressable"

interface HomeHeaderProps {
  user: { displayName?: string; avatarChar?: string } | null
  onNotificationPress: () => void
  onProfilePress?: () => void
}

export const HomeHeader = ({ user, onProfilePress, onNotificationPress }: HomeHeaderProps) => {
  const hour = new Date().getHours()
  const greeting =
    hour < 6
      ? "夜深了"
      : hour < 11
        ? "早上好"
        : hour < 14
          ? "中午好"
          : hour < 18
            ? "下午好"
            : "晚上好"
  return (
    <View style={styles.container}>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text text={user?.avatarChar || "同"} style={styles.avatarText} />
        </View>
        <View style={styles.profileText}>
          <Text text={`${user?.displayName || "同学"}，${greeting}`} style={styles.name} />
        </View>
        <SoftPressable onPress={onNotificationPress} accessibilityRole="button" accessibilityLabel="通知">
          <View style={styles.profileButton}>
            <Icon icon="bell" size={21} color={C.text} />
          </View>
        </SoftPressable>
        {onProfilePress && (
          <SoftPressable
            onPress={onProfilePress}
            accessibilityRole="button"
            accessibilityLabel="编辑个人资料"
          >
            <View style={styles.profileButton}>
              <Icon icon="user" size={23} color={C.text} />
            </View>
          </SoftPressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { paddingBottom: 20 },
  profileRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#718E71",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 20, lineHeight: 28, fontWeight: "500", color: C.white },
  profileText: { flex: 1 },
  brand: { fontSize: 10, lineHeight: 16, letterSpacing: 1.1, color: C.secondary, marginBottom: 3 },
  name: { fontSize: 17, lineHeight: 26, fontWeight: "500", color: C.text },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.36)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    marginLeft: 10,
  },
})
