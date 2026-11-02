import React, { FC, useState, useEffect, useRef } from "react"
import {
  View,
  ViewStyle,
  TextStyle,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  Animated,
  Easing,
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback
} from "react-native"
import { AppStackScreenProps } from "@/navigators/navigationTypes"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import { useAppTheme } from "@/theme/context"
import { useAuth } from "@/context/AuthContext"
import { usersRepository } from "@/services/database/repositories"
import { getHereApiErrorMessage, studentAuthApi } from "@/services/hereApi"
import { $styles as $globalStyles } from "@/theme/styles"

const { width, height } = Dimensions.get("window")
const AppLogo = require("../../assets/images/app-icon-all.png")

// --- 独立的呼吸圆圈组件 (保持你的原样) ---
const BreathingCircle = ({ color, size, top, left, right, bottom, duration, delay }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const opacityAnim = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const breathe = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    )
    
    setTimeout(() => breathe.start(), delay)
  }, [])

  return (
    <Animated.View
      style={{
        position: "absolute",
        top, left, right, bottom,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ scale: scaleAnim }],
        opacity: opacityAnim,
        zIndex: -1,
      }}
    />
  )
}

export const LoginScreen: FC<AppStackScreenProps<"Login">> = (_props) => {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [college, setCollege] = useState("")
  const [colleges, setColleges] = useState<string[]>([])
  const [collegeError, setCollegeError] = useState("")
  const [loading, setLoading] = useState(false)

  const { theme: { colors, spacing } } = useAppTheme()
  const { login } = useAuth()

  useEffect(() => {
    if (mode !== "register") return
    let active = true
    setCollegeError("")
    studentAuthApi.getRegistrationColleges()
      .then(({ colleges: availableColleges }) => {
        if (!active) return
        setColleges(availableColleges)
        setCollege((current) => (
          availableColleges.includes(current) ? current : availableColleges[0] || ""
        ))
        if (!availableColleges.length) setCollegeError("暂无已配置辅导员的学院")
      })
      .catch((error) => {
        if (active) setCollegeError(getHereApiErrorMessage(error, "学院列表加载失败"))
      })
    return () => {
      active = false
    }
  }, [mode])

  async function handleSubmit() {
    if (loading) return
    const normalizedPhone = phone.trim()
    const normalizedName = displayName.trim()

    if (normalizedPhone.length < 6 || !password) {
      Alert.alert("请检查输入", "请输入有效手机号和密码")
      return
    }
    if (password.length < 8) {
      Alert.alert("请检查输入", "密码至少需要 8 个字符")
      return
    }
    if (mode === "register" && !normalizedName) {
      Alert.alert("请检查输入", "注册时需要填写显示名称")
      return
    }
    if (mode === "register" && !college) {
      Alert.alert("请检查输入", "注册时需要选择所属学院")
      return
    }

    setLoading(true)
    try {
      const session = mode === "register"
        ? await studentAuthApi.register(normalizedPhone, password, normalizedName, college)
        : await studentAuthApi.login(normalizedPhone, password)

      usersRepository.cacheAuthenticatedUser(normalizedPhone, { resetRole: mode === "register" })
      login(session)
      if (mode === "register") {
        Alert.alert("注册成功", "学生账号已保存到统一后台")
      }
    } catch (error) {
      Alert.alert(
        mode === "register" ? "注册失败" : "登录失败",
        getHereApiErrorMessage(error),
      )
    } finally {
      setLoading(false)
    }
  }
  // --- 样式定义 ---
  const $styles = {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,
    
    backgroundContainer: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: -1,
        width: width, 
        height: height, 
    } as ViewStyle,

    contentContainer: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      zIndex: 1, 
    } as ViewStyle,

    headerArea: {
      alignItems: "center",
      marginBottom: spacing.xxl,
    } as ViewStyle,
    
    iconContainer: {
      marginBottom: spacing.md,
      backgroundColor: "transparent", 
      shadowColor: colors.primary, 
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.2, 
      shadowRadius: 20,
      elevation: 0, 
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,

    logoImage: {
        width: 180, 
        height: 180,
        borderRadius: 24,
    } as import("react-native").ImageStyle,

    title: {
      fontSize: 36,
      fontWeight: "900",
      color: colors.text,
      letterSpacing: 2,
      lineHeight: 50,
      paddingVertical: 5,
    } as TextStyle,
    
    subtitle: {
      fontSize: 16,
      marginTop: spacing.xs,
      textAlign: "center",
      color: colors.textDim,
      opacity: 0.8,
    } as TextStyle,

    formContainer: {
      gap: spacing.lg,
    } as ViewStyle,

    modeSwitch: {
      flexDirection: "row",
      padding: 4,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle,

    modeButton: {
      flex: 1,
      height: 40,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    } as ViewStyle,

    modeButtonActive: {
      backgroundColor: colors.primary,
    } as ViewStyle,

    modeText: {
      color: colors.textDim,
      fontSize: 15,
      fontWeight: "600",
    } as TextStyle,

    modeTextActive: {
      color: "#FFFFFF",
    } as TextStyle,

    inputWrapper: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      height: 56,
      overflow: 'hidden', 
      justifyContent: 'center',
    } as ViewStyle,

    collegeOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    } as ViewStyle,

    collegeOption: {
      minHeight: 40,
      justifyContent: "center",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    } as ViewStyle,

    collegeOptionActive: {
      borderColor: colors.primary,
      backgroundColor: "#ECFDF5",
    } as ViewStyle,

    loginButton: {
      borderRadius: 30,
      height: 52,
      marginTop: spacing.sm,
      backgroundColor: colors.primary,
      ...$globalStyles.shadowFloating,
    } as ViewStyle,

    loginButtonText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#FFFFFF", 
      flexShrink: 0, 
    } as TextStyle,
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
        
        <Screen
          preset="auto"
          safeAreaEdges={["top", "bottom"]}
          backgroundColor="transparent"
          style={{ backgroundColor: 'transparent', flex: 1 }}
          contentContainerStyle={$styles.contentContainer}
        >
          {/* 背景光斑动画层 */}
          <View style={$styles.backgroundContainer} pointerEvents="none">
              <BreathingCircle color={colors.primary} size={300} top={-100} left={-80} duration={4000} delay={0} />
              <BreathingCircle color={colors.tint} size={200} top={height * 0.3} right={-50} duration={5000} delay={1000} />
              <BreathingCircle color="#adf1d7ff" size={150} bottom={50} left={-30} duration={6000} delay={2000} />
              <BreathingCircle color={colors.primary} size={100} bottom={-20} right={20} duration={4500} delay={500} />
          </View>

          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                
                <View style={$styles.headerArea}>
                  <View style={$styles.iconContainer}>
                    <Image source={AppLogo} style={$styles.logoImage} resizeMode="contain" />
                  </View>
                  <Text text="我在呢" style={$styles.title} />
                  <Text text="您的全时空安全守卫" style={$styles.subtitle} />
                </View>

                <View style={$styles.formContainer}>
                  <View style={$styles.modeSwitch}>
                    {(["login", "register"] as const).map((item) => {
                      const active = mode === item
                      return (
                        <TouchableOpacity
                          key={item}
                          style={[$styles.modeButton, active && $styles.modeButtonActive]}
                          onPress={() => setMode(item)}
                          disabled={loading}
                        >
                          <Text
                            text={item === "login" ? "登录" : "注册"}
                            style={[$styles.modeText, active && $styles.modeTextActive]}
                          />
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  <TextField
                    placeholder="请输入手机号码"
                    placeholderTextColor={colors.textDim}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    editable={!loading}
                    inputWrapperStyle={$styles.inputWrapper} 
                    style={{ fontSize: 16, textAlignVertical: 'center', height: '65%' }}
                  />

                  {mode === "register" && (
                    <>
                      <TextField
                        placeholder="请输入姓名或显示名称"
                        placeholderTextColor={colors.textDim}
                        value={displayName}
                        onChangeText={setDisplayName}
                        editable={!loading}
                        inputWrapperStyle={$styles.inputWrapper}
                        style={{ fontSize: 16, textAlignVertical: "center", height: "65%" }}
                      />
                      <View>
                        <Text text="所属学院（必选）" style={{ marginBottom: spacing.sm, color: colors.textDim }} />
                        <View style={$styles.collegeOptions}>
                          {colleges.map((item) => (
                            <TouchableOpacity
                              key={item}
                              style={[$styles.collegeOption, college === item && $styles.collegeOptionActive]}
                              onPress={() => setCollege(item)}
                              disabled={loading}
                            >
                              <Text
                                text={item}
                                style={{ color: college === item ? colors.primary : colors.text }}
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                        {!!collegeError && (
                          <Text text={collegeError} style={{ marginTop: spacing.xs, color: colors.error }} />
                        )}
                      </View>
                    </>
                  )}

                  <TextField
                    placeholder="请输入登录密码"
                    placeholderTextColor={colors.textDim}
                    value={password}
                    onChangeText={setPassword}
                    editable={!loading}
                    secureTextEntry
                    inputWrapperStyle={$styles.inputWrapper}
                    style={{ fontSize: 16, textAlignVertical: 'center', height: '65%' }}
                  />

                  <Button
                    testID="login-btn"
                    text={loading ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}
                    preset="filled"
                    onPress={handleSubmit}
                    disabled={loading}
                    style={$styles.loginButton}
                    textStyle={$styles.loginButtonText}
                  />
                </View>
              </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Screen>
    </View>
  )
}
