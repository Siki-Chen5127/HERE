import type { ReactNode } from "react"
import { createPortal } from "react-dom"

export function FeedbackPortal({ children }: { children: ReactNode }) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, pointerEvents: "none" }}>
      {children}
    </div>,
    document.body,
  )
}
