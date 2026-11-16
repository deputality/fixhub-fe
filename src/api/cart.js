import { api } from './client'

export const getCart = () => api('/api/cart')

export const addToCart = (serviceId) =>
  api('/api/cart/items', { method: 'POST', body: { serviceId, quantity: 1 } })