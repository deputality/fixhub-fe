import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as favApi from '../api/favorites'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const FavoritesContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useFavorites = () => useContext(FavoritesContext)

const EMPTY = { serviceIds: [], performerIds: [] }

// Избранное есть только у клиентов. Гость при нажатии на сердечко попадает на вход,
// мастеру и администратору объясняем, что функция не для них.
export function FavoritesProvider({ children }) {
  const { user, logout } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState({ userId: null, ...EMPTY })

  const isClient = user?.role === 'Client'

  useEffect(() => {
    if (!isClient) return
    let cancelled = false
    favApi
      .getFavoriteIds()
      .then((ids) => { if (!cancelled) setLoaded({ userId: user.id, ...ids }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isClient, user?.id])

  // данные чужого или прошлого пользователя не показываем
  const ready = isClient && loaded.userId === user.id
  const current = ready ? loaded : { userId: null, ...EMPTY }
  const serviceIds = useMemo(() => new Set(current.serviceIds), [current.serviceIds])
  const performerIds = useMemo(() => new Set(current.performerIds), [current.performerIds])

  const toggle = useCallback(async (kind, id) => {
    if (!user) {
      navigate('/login')
      return false
    }
    if (!isClient) {
      show('Избранное доступно только клиентам', 'error')
      return false
    }

    const key = kind === 'service' ? 'serviceIds' : 'performerIds'
    const had = loaded[key].includes(id)

    // сердечко закрашиваем сразу, а при ошибке возвращаем как было
    const apply = (add) =>
      setLoaded((prev) => ({
        ...prev,
        userId: user.id,
        [key]: add ? [...prev[key].filter((x) => x !== id), id] : prev[key].filter((x) => x !== id),
      }))
    apply(!had)

    try {
      if (kind === 'service') await (had ? favApi.removeFavoriteService(id) : favApi.addFavoriteService(id))
      else await (had ? favApi.removeFavoritePerformer(id) : favApi.addFavoritePerformer(id))
      show(had ? 'Удалено из избранного' : 'Добавлено в избранное')
      return true
    } catch (err) {
      apply(had)
      if (err?.status === 401) {
        logout()
        show('Сессия истекла, войдите снова', 'error')
        navigate('/login')
      } else {
        show(err?.error ?? 'Не удалось изменить избранное', 'error')
      }
      return false
    }
  }, [user, isClient, loaded, navigate, show, logout])

  const toggleService = useCallback((id) => toggle('service', id), [toggle])
  const togglePerformer = useCallback((id) => toggle('performer', id), [toggle])

  return (
    <FavoritesContext.Provider
      value={{
        ready, serviceIds, performerIds,
        count: serviceIds.size + performerIds.size,
        toggleService, togglePerformer,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}
