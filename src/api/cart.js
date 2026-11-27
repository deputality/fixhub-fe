import { api } from './client'

export const getCart = () => api('/api/cart')

// extra (необязательно): { quantity, desiredDate, desiredTime, comment }
export const addToCart = (serviceId, extra = {}) =>
  api('/api/cart/items', { method: 'POST', body: { serviceId, quantity: 1, ...extra } })

// изменить позицию: { quantity, comment, desiredDate, desiredTime }
export const updateCartItem = (itemId, body) =>
  api(`/api/cart/items/${itemId}`, { method: 'PUT', body })

export const removeCartItem = (itemId) =>
  api(`/api/cart/items/${itemId}`, { method: 'DELETE' })

// оформить заказ из корзины: { address, contactPhone, contactName }
export const createOrder = (body) =>
  api('/api/orders', { method: 'POST', body })

// приводит позицию корзины к одному виду, даже если бэкенд назвал поля иначе
export function normalizeItem(raw) {
  const s = raw.service ?? {}
  return {
    id: raw.id ?? raw.cartItemId ?? raw.serviceId,
    serviceId: raw.serviceId ?? s.id,
    performerId: raw.performerId ?? s.performerId,
    title: raw.title ?? raw.serviceTitle ?? s.title ?? 'Услуга',
    price: Number(raw.price ?? raw.unitPrice ?? s.price ?? 0),
    unit: raw.unit ?? s.unit,
    quantity: Number(raw.quantity ?? 1),
    performerName: raw.performerName ?? s.performerName ?? '',
    rating: raw.rating ?? s.rating ?? null,
    reviewCount: raw.reviewCount ?? s.reviewCount ?? 0,
    photoUrl: raw.photoUrl ?? s.photoUrl ?? null,
    categoryId: raw.categoryId ?? s.categoryId,
    comment: raw.comment ?? '',
    desiredDate: String(raw.desiredDate ?? raw.preferredDate ?? '').slice(0, 10),
    desiredTime: String(raw.desiredTime ?? '').slice(0, 5),
  }
}