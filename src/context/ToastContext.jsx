import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

const ToastContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current)
    setToast({ message, type, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          {toast.type === 'error' ? <CircleAlert size={18} /> : <CircleCheck size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}