import { alertOutboxRepository } from "@/services/database/repositories"
import {
  HereApiError,
  getHereApiErrorMessage,
  mobileApi,
  type MobileAlertPayload,
  type MobileAlertResponse,
} from "@/services/hereApi"

export type AlertDeliveryResult = {
  delivery: "sent" | "queued"
  response?: MobileAlertResponse
}

export const createClientEventId = (category: string) => {
  const random = Math.random().toString(36).slice(2, 10)
  return `${category}-${Date.now()}-${random}`
}

const canRetryLater = (error: unknown) => {
  if (!(error instanceof HereApiError)) return true
  return !error.status || error.status >= 500
}

export async function flushPendingAlerts() {
  const pending = alertOutboxRepository.listPending()
  let sent = 0

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload) as MobileAlertPayload
      await mobileApi.createAlert(payload)
      alertOutboxRepository.remove(item.id)
      sent += 1
    } catch (error) {
      alertOutboxRepository.markFailed(item.id, getHereApiErrorMessage(error))
      break
    }
  }

  return { sent, remaining: alertOutboxRepository.listPending().length }
}

export async function submitAlert(payload: MobileAlertPayload): Promise<AlertDeliveryResult> {
  await flushPendingAlerts()

  try {
    const response = await mobileApi.createAlert(payload)
    return { delivery: "sent", response }
  } catch (error) {
    if (!canRetryLater(error)) throw error
    alertOutboxRepository.enqueue(payload)
    return { delivery: "queued" }
  }
}
