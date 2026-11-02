import {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useMMKVString } from "react-native-mmkv"

import {
  AUTH_PERSONA_KEY,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  type AuthSession,
  type StudentUser,
} from "@/services/hereApi"
import { usersRepository } from "@/services/database/repositories"

export type AuthContextType = {
  isAuthenticated: boolean
  authToken: string | null
  currentUser: StudentUser | null
  userRole: string | null
  isLoading: boolean
  login: (session: AuthSession) => void
  logout: () => void
  updateRole: (role: string) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

const getSavedPersonaRole = (role: string | null | undefined) =>
  role === "self" || role === "carer" || role === "elder" ? role : undefined

export const AuthProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [authToken, setAuthToken] = useMMKVString(AUTH_TOKEN_KEY)
  const [authUserJson, setAuthUserJson] = useMMKVString(AUTH_USER_KEY)
  const [userRole, setUserRole] = useMMKVString(AUTH_PERSONA_KEY)
  const [isLoading, setIsLoading] = useState(true)

  const currentUser = useMemo<StudentUser | null>(() => {
    if (!authUserJson) return null
    try {
      return JSON.parse(authUserJson) as StudentUser
    } catch {
      return null
    }
  }, [authUserJson])

  // 1. App 启动时：检查本地令牌
  useEffect(() => {
    setIsLoading(true)
    if (authToken?.startsWith("sqlite_local_token_")) {
      usersRepository.clearActiveUser()
      setAuthToken(undefined)
      setAuthUserJson(undefined)
      setUserRole(undefined)
    } else if (!authToken) {
      usersRepository.clearActiveUser()
      setAuthUserJson(undefined)
      setUserRole(undefined)
    } else if (currentUser?.phone) {
      const localUser = usersRepository.cacheAuthenticatedUser(currentUser.phone)
      setUserRole(getSavedPersonaRole(localUser.role))
    }
    setIsLoading(false)
  }, [authToken, currentUser?.phone, setAuthToken, setAuthUserJson, setUserRole])

  // 2. 登录函数
  const login = useCallback(
    (session: AuthSession) => {
      const localUser = session.user.phone
        ? usersRepository.cacheAuthenticatedUser(session.user.phone)
        : usersRepository.getActiveUser()
      setAuthUserJson(JSON.stringify(session.user))
      setAuthToken(session.access_token)
      setUserRole(getSavedPersonaRole(localUser?.role))
    },
    [setAuthToken, setAuthUserJson, setUserRole],
  )

  // 3. 登出函数
  const logout = useCallback(() => {
    usersRepository.clearActiveUser()
    setAuthToken(undefined)
    setAuthUserJson(undefined)
    setUserRole(undefined)
  }, [setAuthToken, setAuthUserJson, setUserRole])

  // 4. 更新角色函数 (给 PersonaSelectScreen 用)
  const updateRole = useCallback(
    (role: string) => {
      setUserRole(role)
    },
    [setUserRole],
  )

  const value = {
    isAuthenticated: !!authToken && !!currentUser,
    authToken: authToken ?? null,
    currentUser,
    userRole: userRole ?? null,
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
