import Config from "@/config"
import { loadString } from "@/utils/storage"

export const AUTH_TOKEN_KEY = "AuthProvider.authToken"
export const AUTH_USER_KEY = "AuthProvider.authUser"
export const AUTH_PERSONA_KEY = "AuthProvider.userRole"

export type StudentUser = {
  id: string
  name: string
  role: string
  phone?: string | null
  accountStatus?: string
}

export type AuthSession = {
  access_token: string
  token_type: string
  expires_in: number
  user: StudentUser
}

export type AlertSeverity = "low" | "medium" | "high" | "critical"

export type MobileAlertPayload = {
  client_event_id: string
  category: string
  severity: AlertSeverity
  description?: string
  latitude?: number
  longitude?: number
}

export type MobileAlertResponse = {
  status: "created" | "duplicate"
  alert_id: string
  work_order_id?: string
  work_order_number?: string
  assigned_counselor_id?: string
  assigned_counselor_name?: string
}

export type MobileProfile = {
  displayName: string
  phone: string
  college: string | null
  studentNumber: string | null
  className: string | null
}

export type SupportRequest = {
  number: string
  status: string
  message: string | null
  createdAt: string
  milestones?: Record<"submitted" | "assigned" | "received" | "followedUp" | "referred" | "completed", string | null>
  updates: { text: string; createdAt: string }[]
}

export type AiChatMessage = {
  role: "user" | "assistant"
  content: string
}

export type MobileAiResponse = {
  content: string
  model: string
  reasoning_content?: string
}

export type Consultation = {
  id: string; psychologist: string; status: string; scheduledAt: string | null;
  referred: boolean; updatedAt: string | null;
}
export type ConsultationAvailability = {
  day: string
  slots: { hour: number; startsAt: string; available: boolean; state: "available" | "occupied" | "unavailable" | "past" }[]
}
export type WeeklyReflectionInput = {
  moods: { day: string; mood: "good" | "okay" | "tired" }[]
  survey: { rest: string; stress: string; support: string } | null
  support: { submitted: number; awaiting: number; followed_up: number; completed: number } | null
  night_context: Partial<Record<"routine" | "study" | "travel" | "other", number>>
}
export type WeeklyReflection = { score: number | null; summary: string; model: string }

export class HereApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "HereApiError"
    this.status = status
  }
}

const getValidationMessage = (detail: unknown) => {
  if (typeof detail === "string" && detail.trim()) return detail
  if (!Array.isArray(detail)) return null

  const messages = detail
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const value = item as { loc?: unknown[]; msg?: string }
      const field = value.loc?.at(-1)
      const label =
        field === "phone"
          ? "手机号"
          : field === "password"
            ? "密码"
            : field === "display_name"
              ? "显示名称"
              : field === "college"
                ? "所属学院"
              : field
      return [label, value.msg?.replace(/^Value error,\s*/i, "")].filter(Boolean).join("：")
    })
    .filter(Boolean)

  return messages.length ? messages.join("；") : null
}

export const getHereApiErrorMessage = (error: unknown, fallback = "请求处理失败") => {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

type RequestOptions = RequestInit & {
  authenticated?: boolean
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController()
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")

  if (options.body) headers.set("Content-Type", "application/json")
  if (options.authenticated) {
    const token = loadString(AUTH_TOKEN_KEY)
    if (!token) throw new HereApiError("登录状态已失效，请重新登录", 401)
    headers.set("Authorization", `Bearer ${token}`)
  }

  const isAiChat = path === "/mobile/ai/chat" || path === "/mobile/ai/weekly-reflection" || path === "/mobile/ai/safety-analysis"
  const timeout = setTimeout(() => controller.abort(), isAiChat ? 150000 : 15000)
  try {
    const response = await fetch(`${Config.HERE_API_URL.replace(/\/+$/, "")}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })
    const raw = await response.text()
    let data: unknown = null
    if (raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
    }

    if (!response.ok) {
      const detail =
        data && typeof data === "object" && "detail" in data
          ? (data as { detail: unknown }).detail
          : null
      throw new HereApiError(
        getValidationMessage(detail) ?? `服务器返回错误（${response.status}）`,
        response.status,
      )
    }
    return data as T
  } catch (error) {
    if (error instanceof HereApiError) throw error
    if (error instanceof Error && error.name === "AbortError") {
      if (isAiChat) throw new HereApiError("模型回复超时，请稍后重试或缩短问题")
      throw new HereApiError("连接服务器超时，请检查后端和 USB 端口映射")
    }
    throw new HereApiError("无法连接 HERE 服务器，请检查后端是否启动及 USB 端口映射")
  } finally {
    clearTimeout(timeout)
  }
}

export const studentAuthApi = {
  login(phone: string, password: string) {
    return request<AuthSession>("/auth/mobile/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    })
  },

  register(phone: string, password: string, displayName: string, college: string) {
    return request<AuthSession>("/auth/mobile/register", {
      method: "POST",
      body: JSON.stringify({ phone, password, display_name: displayName, college }),
    })
  },

  getRegistrationColleges() {
    return request<{ colleges: string[] }>("/auth/mobile/registration-colleges")
  },
}

export const mobileApi = {
  getConsultations() {
    return request<Consultation[]>("/mobile/consultations", { authenticated: true })
  },
  getConsultationAvailability(day: string, assignmentId?: string) {
    const query = new URLSearchParams({ day })
    if (assignmentId) query.set("assignment_id", assignmentId)
    return request<ConsultationAvailability>("/mobile/consultations/availability?" + query.toString(), { authenticated: true })
  },
  requestAppointment(preferredAt: string, assignmentId?: string) {
    return request<Consultation>("/mobile/consultations/appointments", {
      method: "POST", authenticated: true,
      body: JSON.stringify({ preferred_at: preferredAt, assignment_id: assignmentId ?? null, consent: true }),
    })
  },
  cancelAppointment(id: string) {
    return request<Consultation>("/mobile/consultations/" + encodeURIComponent(id) + "/cancel", {
      method: "POST", authenticated: true,
    })
  },
  getSupportRequests() {
    return request<SupportRequest[]>("/mobile/support-requests", { authenticated: true })
  },

  getProfile() {
    return request<MobileProfile>("/mobile/profile", { authenticated: true })
  },

  updateProfile(payload: { display_name: string; college: string; student_number?: string | null; class_name?: string | null }) {
    return request<{ status: string; displayName: string; college: string; studentNumber: string | null; className: string | null }>("/mobile/profile", {
      method: "PATCH",
      authenticated: true,
      body: JSON.stringify(payload),
    })
  },

  createAlert(payload: MobileAlertPayload) {
    return request<MobileAlertResponse>("/mobile/alerts", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify(payload),
    })
  },

  chat(messages: AiChatMessage[]) {
    return request<MobileAiResponse>("/mobile/ai/chat", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify({ messages }),
    })
  },

  createWeeklyReflection(payload: WeeklyReflectionInput) {
    return request<WeeklyReflection>("/mobile/ai/weekly-reflection", {
      method: "POST", authenticated: true, body: JSON.stringify(payload),
    })
  },

  createSafetyAnalysis(payload: {
    safety_score: number
    alert_count: number
    night_trip_count: number
    active_hours: number
  }) {
    return request<MobileAiResponse>("/mobile/ai/safety-analysis", {
      method: "POST",
      authenticated: true,
      body: JSON.stringify(payload),
    })
  },
}
