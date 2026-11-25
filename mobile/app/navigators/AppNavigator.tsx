import { NavigationContainer } from "@react-navigation/native"
import { createNativeStackNavigator } from "@react-navigation/native-stack"
import React from "react"
import { View, ActivityIndicator, Platform } from "react-native"
import Config from "@/config"
import { useAuth } from "@/context/AuthContext"
import { LoginScreen } from "@/screens/LoginScreen"
import { PersonaSelectScreen } from "@/screens/PersonaSelectScreen"
import { MainNavigator } from "./MainNavigator" 
import { useAppTheme } from "@/theme/context"
import type { AppStackParamList, NavigationProps } from "./navigationTypes"
import { navigationRef, useBackButtonHandler } from "./navigationUtilities"
import { ForgotPasswordScreen } from "@/screens/ForgotPasswordScreen"
import { homeColors } from "@/screens/MainScreen/components/homeAppearance"
import { RouteMotion } from "@/components/RouteMotion"
import { useReducedMotion } from "@/utils/useReducedMotion"

const exitRoutes = Config.exitRoutes
const Stack = createNativeStackNavigator<AppStackParamList>()

const AppStack = () => {
  const { isAuthenticated, userRole, isLoading } = useAuth()
  const { theme: { colors } } = useAppTheme()
  const reducedMotion = useReducedMotion()

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenLayout={({ children, route }) => route.name === "Main" ? children : <RouteMotion>{children}</RouteMotion>}
      screenOptions={{ headerShown: false, animation: reducedMotion ? "none" : "fade" }}
    >
      
      {isAuthenticated ? (
        <>
          {Platform.OS === "web" || userRole ? (
            <Stack.Screen name="Main" component={MainNavigator} options={{ contentStyle: { backgroundColor: homeColors.background } }} />
            
          ) : (
            <Stack.Screen name="PersonaSelect" component={PersonaSelectScreen} />
            
          )}
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>
          
        </>
      )}
    </Stack.Navigator>
  )
}

export const AppNavigator = (props: NavigationProps) => {
  const { navigationTheme } = useAppTheme()
  useBackButtonHandler((routeName) => exitRoutes.includes(routeName))

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme} {...props}>
        <AppStack />
    </NavigationContainer>
  )
}
