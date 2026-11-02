import React, { FC, useState } from "react"
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native"

// 使用相对路径以避免别名解析错误
import { AppStackScreenProps } from "../navigators/navigationTypes"
import { Icon, IconTypes } from "../components/Icon"
import { Screen } from "../components/Screen"
import { Text } from "../components/Text"

import { useAppTheme } from "../theme/context"
import { useAuth } from "../context/AuthContext"
import { usersRepository } from "../services/database/repositories"
import { $styles as $globalStyles } from "../theme/styles"

type PersonaRole = "self" | "carer" | "elder"

export const PersonaSelectScreen: FC<AppStackScreenProps<"PersonaSelect">> = () => {
  const [loading, setLoading] = useState(false)

  const {
    theme: { colors, spacing },
  } = useAppTheme()
  const { updateRole } = useAuth()

  // --- 业务逻辑 ---
  const handleSelectPersona = async (role: PersonaRole) => {
    setLoading(true);
    try {
      console.log("开始设置身份...");
      
      usersRepository.updateActiveUserRole(role)

      console.log("身份设置成功:", role);
      updateRole(role); // 更新 Context 状态

      // 这里的注释代码保持你原来的逻辑不变
      // // --- 关键修复：显式导航跳转 ---
      // // 使用 'as any' 绕过 TypeScript 对路由名称的严格检查，防止报红
      // if (role === 'elder') {
      //   navigation.reset({
      //     index: 0,
      //     routes: [{ name: 'ElderView' as any }], 
      //   });
      // } else {
      //   // 自己/守护者模式 -> 跳转通用 Tab 主页
      //   navigation.reset({
      //     index: 0,
      //     routes: [{ name: 'Tabs' as any }], 
      //   });
      // }

    } catch (err: any) {
      console.log("============== 错误诊断 ==============");
      console.log("error.message =", err.message);
      if (err.message && err.message.includes("Navigation")) {
         Alert.alert("导航错误", "无法跳转页面，请检查 AppNavigator 是否注册了 'ElderView' 或 'Tabs'");
      } else {
         Alert.alert("错误", `身份设置失败: ${err.message || "本地存储异常"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // --- 样式定义 (保持原封不动) ---
  const $styles = {
    screen: { flex: 1, backgroundColor: colors.background } as ViewStyle,
    container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxl } as ViewStyle,
    header: { marginBottom: spacing.xl, marginTop: spacing.lg } as ViewStyle,
    title: { fontSize: 32, fontWeight: "900", color: colors.text, marginBottom: spacing.sm, lineHeight: 40 } as TextStyle,
    subtitle: { color: colors.textDim, fontSize: 16, lineHeight: 24 } as TextStyle,
    main: { gap: spacing.md } as ViewStyle,
    personaButton: {
      flexDirection: "row", alignItems: "center", backgroundColor: colors.surface,
      borderRadius: 20, padding: spacing.md, minHeight: 100, borderWidth: 1,
      borderColor: colors.border, ...$globalStyles.card, elevation: 2, marginBottom: spacing.sm,
    } as ViewStyle,
    iconContainer: {
      width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary + "15", 
      justifyContent: "center", alignItems: "center", marginRight: spacing.md,
    } as ViewStyle,
    personaInfo: { flex: 1, justifyContent: "center" } as ViewStyle,
    personaTitle: { fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 4, lineHeight: 26 } as TextStyle,
    personaSubtitle: { color: colors.textDim, fontSize: 13, lineHeight: 18, flexWrap: 'wrap' } as TextStyle,
    arrowIcon: { marginLeft: spacing.xs } as ViewStyle,
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center", alignItems: "center", zIndex: 999,
    } as ViewStyle,
  }

  // --- 辅助组件：卡片渲染器 ---
  const PersonaCard = ({ 
    icon, title, desc, role, colorOverride 
  }: { 
    icon: IconTypes, title: string, desc: string, role: PersonaRole, colorOverride?: string 
  }) => (
    <TouchableOpacity
      style={$styles.personaButton}
      onPress={() => handleSelectPersona(role)}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[$styles.iconContainer, colorOverride ? { backgroundColor: colorOverride + '15' } : {}]}>
        <Icon icon={icon} size={32} color={colorOverride || colors.primary} />  
      </View>
      
      <View style={$styles.personaInfo}>
        <Text style={[$styles.personaTitle, colorOverride && { color: colorOverride }]} text={title} />
        <Text style={$styles.personaSubtitle} text={desc} />
      </View>

      <Icon icon="caretRight" size={20} color={colors.border} containerStyle={$styles.arrowIcon} />
    </TouchableOpacity>
  )

  return (
    <Screen
      preset="scroll"
      style={$styles.screen}
      contentContainerStyle={$styles.container}
      safeAreaEdges={["top", "bottom"]}
      backgroundColor="transparent"
    >
      <View style={$styles.header}>
        <Text style={$styles.title} text="选择您的身份" />
        <Text style={$styles.subtitle} text="HERE 将为您和家人提供定制化的守护方案。" />
      </View>

      <View style={$styles.main}>
        
        <PersonaCard 
            role="self"
            icon="components" 
            title="为我自己"
            desc="隐私优先。适用于独居青年、高压职业或关注自我安全的人群。"
            colorOverride="#3498db"
        />

        <PersonaCard 
            role="carer"
            icon="view" 
            title="为我的长辈"
            desc="远程守护。实时查看位置轨迹，接收跌倒与求救报警。"
            colorOverride={colors.warning || "#ff9f43"} 
        />

        <PersonaCard 
            role="elder"
            icon="bell" 
            title="我是长辈"
            desc="极简模式。超大字体显示，一键紧急呼救。"
            colorOverride="#2ecc71" 
        />

      </View>

      {loading && (
        <View style={$styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text text="正在设置身份..." style={{ color: "white", marginTop: spacing.md }} />
        </View>
      )}
    </Screen>
  )
}
