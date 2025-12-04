import React, { FC, useState } from "react"
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"
import { AppStackScreenProps } from "@/navigators/navigationTypes"

// (单独导入)
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"

import { useAppTheme } from "@/theme/context"
import { useAuth } from "@/context/AuthContext" // 导入 useAuth
import AV from "../../src/leancloud"

type PersonaRole = "self" | "carer" | "elder"

export const PersonaSelectScreen: FC<AppStackScreenProps<"PersonaSelect">> = (_props) => {
  const [loading, setLoading] = useState(false)

  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const { updateRole } = useAuth() // 获取 V2 的 updateRole 函数

  // --- (任务 3: 后端绑定) ---
  const handleSelectPersona = async (role: PersonaRole) => {
  setLoading(true);
  try {
    console.log("开始设置身份...");

    // 1. 先获取当前用户
    const user = await AV.User.currentAsync();
    if (!user) throw new Error("当前无登录用户");

    console.log("当前用户信息：");
    console.log("user.id =", user.id);
    console.log("sessionToken =", user.getSessionToken());
    console.log("ACL =", user.getACL());

    // 2. 非常关键：强制从服务器刷新一次用户
    // 避免 currentAsync() 返回的是本地缓存的“旧、无 token user”
    const freshUser = await user.fetch();
    console.log("刷新后的用户信息：", freshUser.toJSON());

    // 3. 设置字段
    freshUser.set("userRole", role);
    console.log("准备保存字段 userRole =", role);

    // 4. 保存
    await freshUser.save(null, {
      sessionToken: freshUser.getSessionToken(),
    });

    console.log("身份设置成功:", role);
    updateRole(role);

  } catch (err: any) {
    console.log("============== 错误诊断 ==============");
    console.log("error.name =", err.name);
    console.log("error.code =", err.code);
    console.log("error.message =", err.message);
    console.log("完整错误对象 =", JSON.stringify(err, null, 2));
    console.log("======================================");

    Alert.alert("错误", `身份设置失败: ${err.message || "未知错误"}`);
  }

  setLoading(false);
};

  // (样式定义 - 保持不变)
  const $styles: Record<string, StyleProp<ViewStyle | TextStyle>> = StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: spacing.lg,
    },
    header: {
      alignItems: "center",
      marginVertical: spacing.lg,
    },
    title: {
      fontSize: 30,
      fontWeight: "bold",
      color: colors.text,
    },
    subtitle: {
      color: colors.textDim,
      marginTop: spacing.xs,
      fontSize: 16,
    },
    main: {
      gap: spacing.lg,
    },
    personaButton: {
      backgroundColor: colors.palette.neutral100,
      borderRadius: 16,
      padding: spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.lg,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.palette.secondary100,
      justifyContent: "center",
      alignItems: "center",
      flexShrink: 0,
    },
    personaInfo: {
      flex: 1,
    },
    personaTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    personaSubtitle: {
      color: colors.textDim,
      marginTop: spacing.xxs,
      fontSize: 14,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(255,255,255,0.7)",
      justifyContent: "center",
      alignItems: "center",
    },
  })

  // (Render - 保持不变)
  return (
    <Screen
      preset="scroll"
      style={$styles.screen}
      contentContainerStyle={$styles.container}
    >
      <View style={$styles.header}>
        <Text style={$styles.title} text="选择你的身份" />
        <Text style={$styles.subtitle} text="我们将为您提供专属的守护方案" />
      </View>

      <View style={$styles.main}>
        <TouchableOpacity
          style={$styles.personaButton}
          onPress={() => handleSelectPersona("self")}
          disabled={loading}
        >
          <View style={$styles.iconContainer}>
            <Icon icon="settings" size={30} color={colors.tint} />
          </View>
          <View style={$styles.personaInfo}>
            <Text style={$styles.personaTitle} text="为我自己" />
            <Text style={$styles.personaSubtitle} text="隐私优先，主动守护。适用于高危职业、独居或有心理健康需求的用户" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={$styles.personaButton}
          onPress={() => handleSelectPersona("carer")}
          disabled={loading}
        >
          <View style={$styles.iconContainer}>
            <Icon icon="view" size={30} color={colors.tint} />
          </View>
          <View style={$styles.personaInfo}>
            <Text style={$styles.personaTitle} text="为我的长辈" />
            <Text style={$styles.personaSubtitle} text="远程查看状态，异常及时告警。远程查看长辈状态" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={$styles.personaButton}
          onPress={() => handleSelectPersona("elder")}
          disabled={loading}
        >
          <View style={$styles.iconContainer}>
            <Icon icon="bell" size={30} color={colors.tint} />
          </View>
          <View style={$styles.personaInfo}>
            <Text style={$styles.personaTitle} text="我是长辈" />
            <Text style={$styles.personaSubtitle} text="极简模式，超大字体，一键求助。操作简单，让子女安心" />
          </View>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={$styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      )}
    </Screen>
  )
}