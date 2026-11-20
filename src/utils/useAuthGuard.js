import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

// Возвращает функцию: если сессия истекла (401), выходит из аккаунта и ведёт на вход.
// Функция стабильная, её безопасно ставить в зависимости эффектов.
export function useAuthGuard() {
  const { logout } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const live = useRef({})

  useEffect(() => {
    live.current = { logout, show, navigate }
  })

  return useCallback((err) => {
    if (err?.status !== 401) return false
    live.current.logout()
    live.current.show('Сессия истекла, войдите снова', 'error')
    live.current.navigate('/login')
    return true
  }, [])
}
