import React, { FC, useState } from "react"
import { View } from "react-native"

import { Button } from "@/components/Button"
import { Screen } from "@/components/Screen"
import { Text } from "@/components/Text"
import { TextField } from "@/components/TextField"
import type { AppStackScreenProps } from "@/navigators/navigationTypes"
import { useAppTheme } from "@/theme/context"

export const ForgotPasswordScreen: FC<
  AppStackScreenProps<"ForgotPassword">
> = ({ navigation, route }) => {
  const {
    theme: { colors, spacing },
  } = useAppTheme()

  const [phone, setPhone] = useState(route.params?.phone ?? "")

  return (
    <Screen
      preset="scroll"
      safeAreaEdges={["top", "bottom"]}
      backgroundColor={colors.background}
      contentContainerStyle={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.lg,
      }}
    >
      <Button
        text="返回登录"
        preset="default"
        onPress={() => navigation.goBack()}
        style={{ alignSelf: "flex-start" }}
      />

      <Text
        text="找回密码"
        style={{
          fontSize: 28,
          lineHeight: 40,
          fontWeight: "bold",
          color: colors.text,
          marginTop: spacing.xl,
        }}
      />

      <Text
        text="验证注册手机号后，可以为原账号设置新密码。"
        style={{
          color: colors.textDim,
          marginTop: spacing.sm,
          marginBottom: spacing.xl,
        }}
      />

      <TextField
        label="注册手机号"
        placeholder="请输入注册时使用的手机号"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={32}
      />

      <View style={{ marginTop: spacing.lg }}>
        <Button
          text="获取验证码（暂未开通）"
          preset="filled"
          disabled
        />

        <Text
          text="短信验证服务尚未开通，目前无法在此重置密码。"
          style={{
            color: colors.textDim,
            marginTop: spacing.sm,
          }}
        />
      </View>
    </Screen>
  )
}