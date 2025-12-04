import React, { FC, useState } from "react"
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle, Alert } from "react-native"
import { AppStackScreenProps } from "@/navigators/navigationTypes"

// (单独导入)
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"

import { useAppTheme } from "@/theme/context"
import { useAuth } from "@/context/AuthContext" 
import AV from "../../src/leancloud"

export const LoginScreen: FC<AppStackScreenProps<"Login">> = (_props) => {
  const [isPasswordMode, setIsPasswordMode] = useState(false)
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const {
    theme: { colors, spacing },
  } = useAppTheme()
  
  const { login } = useAuth() 

  // (发送验证码)
  async function handleSendCode() {
    if (loading || countdown > 0) return
    setLoading(true)
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      Alert.alert("错误", "请输入有效的手机号码。")
      setLoading(false)
      return
    }
    try {
      await AV.Cloud.run("sendVerificationCode", { phone: phone })
      Alert.alert("成功", `验证码已发送到 ${phone}。`)
      setCountdown(60)
      const timer = setInterval(() => setCountdown((p) => (p <= 1 ? 0 : p - 1)), 1000)
    } catch (error: any) {
      console.error("发送验证码失败:", error)
      Alert.alert("错误", `发送验证码失败: ${error.message || '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  // (验证码登录)
  async function handleCodeLogin() {
    if (loading) return
    setLoading(true)
    try {
      const user = await AV.User.logInWithMobilePhone(phone, code)
      login(user) 
    } catch (error: any) {
      console.error("验证码登录失败:", error)
      Alert.alert("登录失败", error.message || '未知错误')
    } finally {
      setLoading(false)
    }
  }

  // (密码登录/注册)
  async function handlePasswordLoginOrRegister() {
    if (loading) return
    setLoading(true)

    try {
      // 1. 尝试登录
      const user = await AV.User.logInWithMobilePhone(phone, password)
      console.log("密码登录成功:", user.toJSON())
      login(user)
      
    } catch (error: any) {
      if (error.code === 211) {
        console.log("用户不存在，尝试自动注册...")
        // --- 修复点：确保 try 后面紧跟 catch ---
        try {
          // 2. 自动注册
          const newUser = new AV.User()
          newUser.setUsername(phone)
          newUser.setPassword(password)
          newUser.setMobilePhoneNumber(phone)

          const registeredUser = await newUser.signUp()
          console.log("自动注册成功:", registeredUser.toJSON())
          
          login(registeredUser)

        } catch (regError: any) {
          console.error("注册失败:", regError)
          Alert.alert("注册失败", regError.message || '未知错误')
        }
        // --- 修复结束 ---
      } else {
        console.error("登录失败:", error)
        Alert.alert("登录失败", error.message || '未知错误')
      }
    } finally {
      setLoading(false)
    }
  }

  // (样式定义)
  const $styles: Record<string, StyleProp<ViewStyle | TextStyle>> = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    container: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
    },
    icon: { marginBottom: spacing.lg },
    title: { fontSize: 48, fontWeight: "bold", marginBottom: spacing.md, color: colors.text },
    subtitle: {
      fontSize: 18,
      marginBottom: spacing.xxl,
      paddingHorizontal: spacing.md,
      textAlign: "center",
      color: colors.textDim,
    },
    formContainer: { width: "100%", gap: spacing.md },
    codeRow: {
      flexDirection: "row",
      gap: spacing.xs,
      width: "100%",
      alignItems: "center",
    },
    codeInput: { flex: 1 },
    codeButton: { flexShrink: 0, minWidth: 120 },
    toggleButton: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
      alignSelf: 'center',
    },
    toggleButtonText: {
      color: colors.tint,
      fontSize: 14,
    }
  })

  return (
    <Screen
      preset="auto"
      style={$styles.screen}
      contentContainerStyle={$styles.container}
    >
      <Icon
        icon="shield-check"
        color={colors.tint}
        size={60}
        containerStyle={$styles.icon}
      />
      <Text text="HERE" preset="heading" style={$styles.title} />
      <Text text="您的专属安全守护，为您和家人带来安心。" style={$styles.subtitle} />

      <View style={$styles.formContainer}>
        <TextField
          placeholder="输入手机号"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          editable={!loading}
        />

        {isPasswordMode ? (
          <TextField
            placeholder="输入密码 (至少6位)"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry
          />
        ) : (
          <View style={$styles.codeRow}>
            <TextField
              placeholder="输入验证码"
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              containerStyle={$styles.codeInput}
              editable={!loading}
            />
            <Button
              text={countdown > 0 ? `${countdown}s` : "发送验证码"}
              preset="reversed"
              onPress={handleSendCode}
              style={$styles.codeButton}
              disabled={loading || countdown > 0}
            />
          </View>
        )}

        <Button
          testID="login-btn"
          text="登录 / 注册"
          preset="filled"
          onPress={isPasswordMode ? handlePasswordLoginOrRegister : handleCodeLogin}
          disabled={loading}
        />

        <Button
          text={isPasswordMode ? "使用验证码登录" : "使用密码登录/注册"}
          onPress={() => setIsPasswordMode((prev) => !prev)}
          style={$styles.toggleButton}
          textStyle={$styles.toggleButtonText}
          disabled={loading}
        />
      </View>
    </Screen>
  )
}