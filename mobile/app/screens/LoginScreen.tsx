import { feedback } from "@/components/Feedback"
import { ComponentProps, FC, forwardRef, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  // This local field replaces the fixed-height shared field on the auth form.
  // eslint-disable-next-line no-restricted-imports
  TextInput,
  TextInputProps,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Feather from "@expo/vector-icons/Feather"

import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { useAuth } from "@/context/AuthContext"
import { AppStackScreenProps } from "@/navigators/navigationTypes"
import { GlassSurface } from "@/screens/MainScreen/components/GlassSurface"
import { homeColors as C } from "@/screens/MainScreen/components/homeAppearance"
import { SoftPressable } from "@/screens/MainScreen/components/SoftPressable"
import { usersRepository } from "@/services/database/repositories"
import { getHereApiErrorMessage, studentAuthApi } from "@/services/hereApi"
import { useViewport } from "@/utils/useViewport"

type Mode = "login" | "register"

// Contest builds can opt in to the shortcut using a dedicated public demo account.
const DEMO_PHONE = process.env.EXPO_PUBLIC_DEMO_STUDENT_PHONE?.trim() ?? ""
const DEMO_PASSWORD = process.env.EXPO_PUBLIC_DEMO_STUDENT_PASSWORD ?? ""
const hasDemoAccount = Boolean(DEMO_PHONE && DEMO_PASSWORD)
const FORM_COLORS = {
  brandLine: "rgba(69,104,75,0.3)",
  switchBackground: "rgba(215,225,207,0.55)",
  activeBackground: "rgba(255,255,255,0.9)",
  activeEdge: "rgba(255,255,255,0.95)",
  inputBackground: "rgba(255,255,255,0.5)",
  inputBorder: "rgba(118,144,116,0.19)",
  focusBorder: "#6D9277",
  focusBackground: "rgba(255,255,255,0.82)",
  collegeBorder: "rgba(118,144,116,0.2)",
  collegeBackground: "rgba(255,255,255,0.4)",
  collegeSelected: "#E0EADC",
  collegeSelectedBorder: "#73967C",
  errorBackground: "rgba(255,239,233,0.85)",
  submitEdge: "rgba(255,255,255,0.6)",
  pickerBackground: "#F6F7EE",
  pickerOverlay: "rgba(25,40,32,0.25)",
  clear: "transparent",
}
type FieldErrors = Partial<Record<"phone" | "password" | "displayName" | "college", string>>

interface LoginFieldProps extends TextInputProps {
  label: string
  icon: ComponentProps<typeof Feather>["name"]
  error?: string
  accessory?: React.ReactNode
  compact?: boolean
}

// Local form field: content determines its height, including with large system fonts.
const LoginField = forwardRef<TextInput, LoginFieldProps>(function LoginField(
  { label, icon, error, accessory, compact, onFocus, onBlur, ...inputProps },
  ref,
) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <Text text={label} style={[styles.label, compact && styles.compactLabel]} />
      <View
        style={[styles.inputShell, focused && styles.inputFocused, !!error && styles.inputError]}
      >
        <Feather
          name={icon}
          size={19}
          color={focused ? C.primary : C.secondary}
          accessible={false}
        />
        <TextInput
          {...inputProps}
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor="#7A887C"
          selectionColor={C.primary}
          underlineColorAndroid="transparent"
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="center"
          style={[styles.input, compact && styles.compactInput]}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
        />
        {accessory}
      </View>
      {!!error && <Text text={error} accessibilityLiveRegion="polite" style={styles.fieldError} />}
    </View>
  )
})

export const LoginScreen: FC<AppStackScreenProps<"Login">> = ({ navigation }) => {
  const { width, fontScale } = useViewport()
  const desktop = Platform.OS === "web" && width >= 970 && fontScale < 1.3
  const [mode, setMode] = useState<Mode>("login")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [college, setCollege] = useState("")
  const [colleges, setColleges] = useState<string[]>([])
  const [collegeError, setCollegeError] = useState("")
  const [collegeLoading, setCollegeLoading] = useState(false)
  const [collegeRetry, setCollegeRetry] = useState(0)
  const [collegePickerVisible, setCollegePickerVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState("")
  const passwordRef = useRef<TextInput>(null)
  const submitting = useRef(false)
  const mounted = useRef(true)
  const { login } = useAuth()

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (mode !== "register") return
    let active = true
    setCollegeLoading(true)
    setCollegeError("")
    studentAuthApi
      .getRegistrationColleges()
      .then(({ colleges: available }) => {
        if (!active) return
        setColleges(available)
        setCollege((current) => (available.includes(current) ? current : available[0] || ""))
        if (!available.length) setCollegeError("暂时没有可选学院，请稍后再试。")
      })
      .catch((error) => {
        if (!active) return
        setColleges([])
        setCollege("")
        setCollegeError(getHereApiErrorMessage(error, "学院列表加载失败"))
      })
      .finally(() => {
        if (active) setCollegeLoading(false)
      })
    return () => {
      active = false
    }
  }, [mode, collegeRetry])

  const clearError = (field: keyof FieldErrors) => {
    setErrors((previous) => ({ ...previous, [field]: undefined }))
    setFormError("")
  }

  const switchMode = (next: Mode) => {
    if (submitting.current || next === mode) return
    Keyboard.dismiss()
    setMode(next)
    setCollegePickerVisible(false)
    setErrors({})
    setFormError("")
    setPasswordVisible(false)
  }

  const fillDemoAccount = () => {
    if (submitting.current || !hasDemoAccount || mode !== "login") return
    Keyboard.dismiss()
    setPhone(DEMO_PHONE)
    setPassword(DEMO_PASSWORD)
    setPasswordVisible(false)
    setErrors({})
    setFormError("")
  }

  async function handleSubmit() {
    if (submitting.current) return
    const normalizedPhone = phone.trim()
    const normalizedName = displayName.trim()
    const nextErrors: FieldErrors = {}
    if (normalizedPhone.length < 6) nextErrors.phone = "请输入有效的手机号"
    if (!password) nextErrors.password = "请输入密码"
    else if (password.length < 8) nextErrors.password = "密码至少需要 8 个字符"
    if (mode === "register") {
      if (!normalizedName) nextErrors.displayName = "请填写一个显示名称"
      if (!college || !colleges.includes(college)) nextErrors.college = "请选择所属学院"
      if (collegeLoading) nextErrors.college = "学院列表正在加载，请稍候"
    }
    setErrors(nextErrors)
    setFormError("")
    if (Object.keys(nextErrors).length) return

    submitting.current = true
    setLoading(true)
    Keyboard.dismiss()
    const submitMode = mode
    try {
      const session =
        submitMode === "register"
          ? await studentAuthApi.register(normalizedPhone, password, normalizedName, college)
          : await studentAuthApi.login(normalizedPhone, password)
      usersRepository.cacheAuthenticatedUser(normalizedPhone, {
        resetRole: submitMode === "register",
      })
      login(session)
      if (submitMode === "register") feedback.success("注册成功", "账号已创建，欢迎来到 HERE。")
    } catch (error) {
      if (mounted.current) setFormError(getHereApiErrorMessage(error))
    } finally {
      submitting.current = false
      if (mounted.current) setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
      >
        <Image
          source={require("@assets/images/home-ambient.png")}
          resizeMode="cover"
          style={styles.background}
        />
        <LinearGradient
          colors={["rgba(248,247,233,0.22)", "rgba(243,246,233,0.65)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Screen
        preset="auto"
        safeAreaEdges={["top", "bottom"]}
        backgroundColor="transparent"
        systemBarStyle="dark"
        contentContainerStyle={[styles.screenContent, mode === "register" && styles.compactScreen]}
        keyboardShouldPersistTaps="handled"
        ScrollViewProps={{ keyboardDismissMode: "on-drag", showsVerticalScrollIndicator: false }}
      >
        <View style={[styles.column, desktop && styles.desktopColumn]}>
          <View
            style={[
              styles.header,
              desktop && styles.desktopHeader,
              mode === "register" && styles.compactHeader,
            ]}
          >
            {mode === "login" && (
              <Image
                source={require("@assets/images/app-icon-all.png")}
                resizeMode="contain"
                style={styles.logoImage}
                accessibilityLabel="HERE 我在呢"
              />
            )}

            <Text
              text={
                mode === "login"
                  ? "给自己一点空间"
                  : "从这里，慢慢开始"
              }
              style={[styles.heading, desktop && styles.desktopHeading]}
            />

            <Text
              text={
                mode === "login"
                  ? "欢迎回来"
                  : "先认识一下彼此"
              }
              style={[styles.subheading, desktop && styles.desktopSubheading]}
            />
          </View>

          <GlassSurface style={desktop && styles.desktopForm} contentStyle={[styles.form, mode === "register" && styles.compactForm]}>
            <View style={styles.modeSwitch} accessibilityRole="tablist">
              {(["login", "register"] as const).map((item) => {
                const active = mode === item
                return (
                  <SoftPressable
                    key={item}
                    testID={"auth-mode-" + item}
                    style={[styles.modeWrapper, active && styles.modeActive]}
                    onPress={() => switchMode(item)}
                    disabled={loading}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active, disabled: loading }}
                    accessibilityLabel={item === "login" ? "登录" : "注册"}
                  >
                    <View style={styles.modeButton}>
                      <Text
                        text={item === "login" ? "登录" : "注册"}
                        style={[styles.modeText, active && styles.modeTextActive]}
                      />
                    </View>
                  </SoftPressable>
                )
              })}
            </View>

            <LoginField
              testID="auth-phone"
              compact={mode === "register"}
              label="手机号"
              icon="smartphone"
              placeholder="请输入手机号"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={32}
              value={phone}
              editable={!loading}
              error={errors.phone}
              returnKeyType="next"
              onChangeText={(value) => {
                setPhone(value)
                clearError("phone")
              }}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {mode === "register" && (
              <>
                <LoginField
                  testID="auth-name"
                  compact
                  label="显示名称"
                  icon="user"
                  placeholder="希望我们怎么称呼你"
                  maxLength={100}
                  value={displayName}
                  editable={!loading}
                  error={errors.displayName}
                  onChangeText={(value) => {
                    setDisplayName(value)
                    clearError("displayName")
                  }}
                />
                <View style={[styles.field, styles.compactField]}>
                  <Text text="所属学院" style={[styles.label, styles.compactLabel]} />
                  {collegeLoading ? (
                    <View style={styles.collegeLoading}>
                      <ActivityIndicator size="small" color={C.primary} />
                      <Text text="正在加载学院…" style={styles.helper} />
                    </View>
                  ) : (
                    <SoftPressable
                      testID="auth-college-select"
                      disabled={loading || !colleges.length}
                      accessibilityRole="button"
                      accessibilityLabel={"选择所属学院，当前为" + (college || "未选择")}
                      accessibilityState={{
                        expanded: collegePickerVisible,
                        disabled: loading || !colleges.length,
                      }}
                      onPress={() => {
                        Keyboard.dismiss()
                        setCollegePickerVisible(true)
                      }}
                    >
                      <View style={[styles.inputShell, styles.collegeSelect]}>
                        <Feather name="book-open" size={19} color={C.secondary} />
                        <Text
                          text={college || "请选择学院"}
                          style={styles.collegeSelectText}
                          numberOfLines={1}
                        />
                        <Feather name="chevron-down" size={18} color={C.secondary} />
                      </View>
                    </SoftPressable>
                  )}
                  {!!collegeError && (
                    <View>
                      <Text
                        text={collegeError}
                        style={styles.fieldError}
                        accessibilityLiveRegion="polite"
                      />
                      <SoftPressable
                        accessibilityRole="button"
                        accessibilityLabel="重新加载学院"
                        disabled={loading || collegeLoading}
                        onPress={() => setCollegeRetry((value) => value + 1)}
                      >
                        <View style={styles.retryButton}>
                          <Feather name="refresh-cw" size={14} color={C.primary} />
                          <Text text="重新加载" style={styles.linkText} />
                        </View>
                      </SoftPressable>
                    </View>
                  )}
                  {!!errors.college && (
                    <Text
                      text={errors.college}
                      style={styles.fieldError}
                      accessibilityLiveRegion="polite"
                    />
                  )}
                </View>
              </>
            )}

            <LoginField
              ref={passwordRef}
              testID="auth-password"
              compact={mode === "register"}
              label="密码"
              icon="lock"
              placeholder={mode === "login" ? "请输入密码" : "设置密码，至少 8 个字符"}
              value={password}
              editable={!loading}
              maxLength={128}
              secureTextEntry={!passwordVisible}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              error={errors.password}
              onChangeText={(value) => {
                setPassword(value)
                clearError("password")
              }}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              accessory={
                <SoftPressable
                  testID="auth-toggle-password"
                  onPress={() => setPasswordVisible((value) => !value)}
                  disabled={loading}
                  accessibilityRole="button"
                  accessibilityLabel={passwordVisible ? "隐藏密码" : "显示密码"}
                >
                  <View style={styles.eyeButton}>
                    <Feather
                      name={passwordVisible ? "eye-off" : "eye"}
                      size={19}
                      color={C.secondary}
                    />
                  </View>
                </SoftPressable>
              }
            />

            {mode === "login" && (
              <View style={styles.loginActions}>
                {hasDemoAccount && (
                  <SoftPressable
                    testID="fill-demo-account"
                    accessibilityRole="button"
                    accessibilityLabel="填入演示账号"
                    accessibilityState={{ disabled: loading }}
                    disabled={loading}
                    onPress={fillDemoAccount}
                  >
                    <View style={styles.demoButton}>
                      <Feather name="user-check" size={16} color={C.primary} accessible={false} />
                      <Text text="填入演示账号" style={styles.linkText} />
                    </View>
                  </SoftPressable>
                )}
                <SoftPressable
                  testID="forgot-password-btn"
                  accessibilityRole="button"
                  accessibilityLabel="忘记密码"
                  disabled={loading}
                  onPress={() => navigation.navigate("ForgotPassword", { phone: phone.trim() })}
                  style={styles.forgotWrapper}
                >
                  <View style={styles.forgotButton}>
                    <Text text="忘记密码？" style={styles.linkText} />
                  </View>
                </SoftPressable>
              </View>
            )}

            {!!formError && (
              <View style={styles.formError}>
                <Feather name="alert-circle" size={17} color={C.danger} />
                <Text
                  text={formError}
                  style={styles.formErrorText}
                  accessibilityLiveRegion="polite"
                />
              </View>
            )}

            <SoftPressable
              testID="login-btn"
              accessibilityRole="button"
              accessibilityLabel={mode === "login" ? "登录 HERE" : "注册并登录"}
              accessibilityState={{ busy: loading, disabled: loading }}
              disabled={loading}
              onPress={handleSubmit}
              style={styles.submitWrapper}
            >
              <LinearGradient
                colors={["#668B6D", "#376F55"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather
                    name={mode === "login" ? "arrow-right" : "check"}
                    size={19}
                    color="#F5F8ED"
                  />
                )}
                <Text
                  text={loading ? "请稍候…" : mode === "login" ? "登录 Here" : "注册并登录"}
                  style={styles.submitText}
                />
              </LinearGradient>
            </SoftPressable>
          </GlassSurface>
        </View>
      </Screen>

      <Modal
        visible={collegePickerVisible && mode === "register"}
        transparent
        animationType="fade"
        onRequestClose={() => setCollegePickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCollegePickerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="关闭学院选择"
          />
          <View style={styles.pickerPanel} accessibilityViewIsModal>
            <View style={styles.pickerHeader}>
              <Text text="选择所属学院" style={styles.pickerTitle} />
              <SoftPressable
                testID="auth-college-close"
                onPress={() => setCollegePickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="关闭学院选择"
              >
                <View style={styles.eyeButton}>
                  <Feather name="x" size={20} color={C.text} />
                </View>
              </SoftPressable>
            </View>
            <ScrollView style={styles.pickerList} keyboardShouldPersistTaps="handled">
              {colleges.map((item) => (
                <SoftPressable
                  key={item}
                  accessibilityRole="radio"
                  accessibilityLabel={item}
                  accessibilityState={{ checked: college === item }}
                  onPress={() => {
                    setCollege(item)
                    clearError("college")
                    setCollegePickerVisible(false)
                  }}
                >
                  <View style={styles.pickerRow}>
                    <Text text={item} style={styles.collegeSelectText} />
                    {college === item && <Feather name="check" size={20} color={C.primary} />}
                  </View>
                </SoftPressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  background: { height: "100%", opacity: 0.8, width: "100%" },
  collegeLoading: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 10 },
  collegeSelect: { minHeight: 48, paddingRight: 14 },
  collegeSelectText: { color: C.text, flex: 1, fontSize: 14, lineHeight: 22, marginHorizontal: 10 },
  column: { alignSelf: "center", maxWidth: 440, width: "100%" },
  desktopColumn: { maxWidth: 1030, flexDirection: "row", alignItems: "center", gap: 65, paddingHorizontal: 24 },
  desktopHeader: { flex: 1, alignItems: "flex-start", marginBottom: 0 },
  desktopHeading: { fontSize: 48, lineHeight: 63, textAlign: "left" },
  desktopSubheading: { fontSize: 18, lineHeight: 28, textAlign: "left" },
  desktopForm: { flex: 1 },
  compactField: { marginBottom: 10 },
  compactForm: { padding: 16 },
  compactHeader: { marginBottom: 12, paddingTop: 0 },
  compactInput: { minHeight: 48, paddingVertical: 10 },
  compactLabel: { fontSize: 12, lineHeight: 18, marginBottom: 5 },
  compactScreen: { paddingVertical: 12 },
  eyeButton: { alignItems: "center", justifyContent: "center", minHeight: 48, width: 44 },
  field: { marginBottom: 18 },
  fieldError: { color: C.danger, fontSize: 12, lineHeight: 20, marginHorizontal: 3, marginTop: 6 },
  forgotButton: { justifyContent: "center", minHeight: 44, paddingHorizontal: 3 },
  forgotWrapper: { marginLeft: "auto" },
  loginActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 5,
    marginTop: -12,
  },
  demoButton: {
    alignItems: "center",
    backgroundColor: FORM_COLORS.switchBackground,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  form: { borderRadius: 28, padding: 22 },
  formError: {
    alignItems: "flex-start",
    backgroundColor: FORM_COLORS.errorBackground,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  formErrorText: { color: C.danger, flex: 1, fontSize: 13, lineHeight: 21 },
  header: { alignItems: "center", marginBottom: 24, paddingTop: 8 },
  heading: { color: C.text, fontSize: 25, fontWeight: "500", lineHeight: 36, textAlign: "center" },
  helper: { color: C.secondary, fontSize: 13, lineHeight: 21 },
  input: {
    color: C.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 54,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  inputError: { borderColor: C.danger },
  inputFocused: {
    backgroundColor: FORM_COLORS.focusBackground,
    borderColor: FORM_COLORS.focusBorder,
  },
  inputShell: {
    alignItems: "center",
    backgroundColor: FORM_COLORS.inputBackground,
    borderColor: FORM_COLORS.inputBorder,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingLeft: 14,
    paddingRight: 3,
  },
  label: {
    color: C.text,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 21,
    marginBottom: 7,
    marginLeft: 3,
  },
  linkText: { color: C.primary, fontSize: 13, lineHeight: 21 },
  logoCompact: { height: 72, marginBottom: 0, width: 100 },
  logoImage: { height: 140, marginBottom: 8, width: 180 },
  modeActive: {
    backgroundColor: FORM_COLORS.activeBackground,
    borderColor: FORM_COLORS.activeEdge,
    borderRadius: 999,
  },
  modeButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  modeSwitch: {
    backgroundColor: FORM_COLORS.switchBackground,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
    overflow: "hidden",
    padding: 4,
  },
  modeText: { color: C.secondary, fontSize: 15, lineHeight: 23 },
  modeTextActive: { color: C.primary, fontWeight: "600" },
  modeWrapper: {
    borderColor: FORM_COLORS.clear,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },
  pickerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  pickerList: { flexGrow: 0, flexShrink: 1 },
  pickerOverlay: {
    alignItems: "center",
    backgroundColor: FORM_COLORS.pickerOverlay,
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  pickerPanel: {
    backgroundColor: FORM_COLORS.pickerBackground,
    borderRadius: 24,
    maxHeight: "70%",
    maxWidth: 440,
    overflow: "hidden",
    padding: 16,
    width: "100%",
  },
  pickerRow: {
    alignItems: "center",
    borderBottomColor: C.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 52,
    paddingVertical: 12,
  },
  pickerTitle: { color: C.text, fontSize: 17, fontWeight: "600", lineHeight: 25 },
  retryButton: { alignItems: "center", flexDirection: "row", gap: 6, minHeight: 44 },
  root: { backgroundColor: C.background, flex: 1 },
  screenContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  subheading: {
    color: C.secondary,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
    textAlign: "center",
  },
  submitButton: {
    alignItems: "center",
    borderColor: FORM_COLORS.submitEdge,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 54,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  submitText: { color: C.white, flexShrink: 1, fontSize: 16, fontWeight: "600", lineHeight: 24 },
  submitWrapper: { marginTop: 5 },
})
