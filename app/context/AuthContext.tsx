import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { useMMKVString } from "react-native-mmkv"
import AV from "../../src/leancloud" // 使用你的正确路径

export type AuthContextType = {
  isAuthenticated: boolean
  userRole: string | null // 新增：用户角色
  isLoading: boolean // 新增：初始加载状态
  login: (user: AV.User) => void // 新增：登录函数
  logout: () => void
  updateRole: (role: string) => void // 新增：更新角色函数
}

export const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [authToken, setAuthToken] = useMMKVString("AuthProvider.authToken")
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true) // 默认在加载

  // 1. App 启动时：检查本地令牌
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true)
      try {
        if (authToken) {
          // 令牌存在，尝试用它恢复登录
          const user = await AV.User.become(authToken)
          // 恢复成功，获取角色
          setUserRole(user.get("userRole") || null)
        } else {
          // 没有令牌
          setUserRole(null)
        }
      } catch (e) {
        // 令牌无效 (例如已过期)
        console.error("令牌恢复失败:", e)
        setAuthToken(undefined) // 清除坏令牌
        setUserRole(null)
      } finally {
        setIsLoading(false) // 加载完成
      }
    }
    checkAuth()
  }, [authToken, setAuthToken])

  // 2. 登录函数 (给 LoginScreen 用)
  const login = useCallback(
    (user: AV.User) => {
      const token = user.getSessionToken()
      const role = user.get("userRole") || null
      setAuthToken(token) // 存储令牌
      setUserRole(role) // 存储角色
      // 状态更新将自动触发 AppNavigator 刷新
    },
    [setAuthToken, setUserRole],
  )

  // 3. 登出函数
  const logout = useCallback(() => {
    console.log("--- [AuthContext] 登出 ---")
    setAuthToken(undefined)
    setUserRole(null)
    AV.User.logOut()
    // 状态更新将自动触发 AppNavigator 刷新
  }, [setAuthToken, setUserRole])

  // 4. 更新角色函数 (给 PersonaSelectScreen 用)
  const updateRole = useCallback(
    (role: string) => {
      setUserRole(role) // 更新本地角色状态
      // 状态更新将自动触发 AppNavigator 刷新
    },
    [setUserRole],
  )

  const value = {
    isAuthenticated: !!authToken, // 只要有令牌就算登录
    userRole, // 当前角色 (null 或 'self', 'carer', 'elder')
    isLoading,
    login,
    logout,
    updateRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}