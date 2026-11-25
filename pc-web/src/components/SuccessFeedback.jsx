import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const eventName = 'here:success-feedback'

export function showSuccess(message) {
  if (message) window.dispatchEvent(new CustomEvent(eventName, { detail: message }))
}

export function SuccessFeedback() {
  const [notice, setNotice] = useState(null)
  useEffect(() => {
    let timer
    let id = 0
    function onSuccess({ detail }) {
      window.clearTimeout(timer)
      setNotice({ id: ++id, message: detail })
      timer = window.setTimeout(() => setNotice(null), 2300)
    }
    window.addEventListener(eventName, onSuccess)
    return () => {
      window.removeEventListener(eventName, onSuccess)
      window.clearTimeout(timer)
    }
  }, [])

  return createPortal(
    <div className="here-feedback-layer" role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className="here-feedback">
          <span className="here-feedback-mark"><Check size={27} aria-hidden="true" /></span>
          <span>{notice.message}</span>
        </div>
      )}
    </div>,
    document.body,
  )
}
