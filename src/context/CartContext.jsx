import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as cartApi from '../api/cart'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

const CartContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext)

export function CartProvider({ children }) {
  const { user, logout } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const [loadedCount, setLoadedCount] = useState(0)

  const isClient = user?.role === 'Client'

  useEffect(() => {
    if (!isClient) return
    let cancelled = false
    cartApi
      .getCart()
      .then((cart) => { if (!cancelled) setLoadedCount(cart.items.length) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isClient, user?.id])

  const addToCart = useCallback(async (serviceId) => {
    if (!user) {
      navigate('/login')
      return false
    }
    if (!isClient) {
      show('Корзина доступна только клиентам', 'error')
      return false
    }
    try {
      const cart = await cartApi.addToCart(serviceId)
      setLoadedCount(cart.items.length)
      show('Услуга добавлена в корзину')
      return true
    } catch (err) {
      if (err.status === 401) {
        logout()
        show('Сессия истекла, войдите снова', 'error')
        navigate('/login')
        return false
      }
      show(err.error ?? 'Не удалось добавить в корзину', 'error')
      return false
    }
  }, [user, isClient, navigate, show, logout])

  return (
    <CartContext.Provider value={{ count: isClient ? loadedCount : 0, addToCart }}>
      {children}
    </CartContext.Provider>
  )
}