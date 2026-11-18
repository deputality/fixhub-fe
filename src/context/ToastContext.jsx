import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, X } from 'lucide-react'

const ToastContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

const LIFETIME = 3200
const EXIT = 260
const MAX_TOASTS = 3

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Set())

  useEffect(() => {
    const all = timers.current
    return () => all.forEach(clearTimeout)
  }, [])

  const later = useCallback((fn, ms) => {
    const t = setTimeout(() => {
      timers.current.delete(t)
      fn()
    }, ms)
    timers.current.add(t)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)))
    later(() => setToasts((list) => list.filter((t) => t.id !== id)), EXIT)
  }, [later])

  const show = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((list) => [...list.slice(-(MAX_TOASTS - 1)), { id, message, type }])
    later(() => dismiss(id), LIFETIME)
  }, [dismiss, later])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}${t.leaving ? ' leaving' : ''}`}
            role="status"
          >
            {t.type === 'error' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
            <span>{t.message}</span>
            <button type="button" className="toast-close" aria-label="Закрыть" onClick={() => dismiss(t.id)}>
              <X size={15} />
            </button>
            <i className="toast-bar" style={{ animationDuration: `${LIFETIME}ms` }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}