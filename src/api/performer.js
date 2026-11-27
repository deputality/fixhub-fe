import { api } from './client'

// completedOrders, completedAmount, newOrders, activeOrders, cancelledOrders
export const getPerformerStats = () => api('/api/performer/stats')

// ---- услуги мастера ----
export const getMyServices = () => api('/api/performer/services')

// { categoryId, title, description, photoUrl, price, unit: 'Hour' | 'Piece' }
export const createService = (body) => api('/api/performer/services', { method: 'POST', body })
export const updateService = (id, body) => api(`/api/performer/services/${id}`, { method: 'PUT', body })
export const hideService = (id) => api(`/api/performer/services/${id}/hide`, { method: 'PATCH' })
export const showService = (id) => api(`/api/performer/services/${id}/show`, { method: 'PATCH' })

// загрузка фото услуги (JPG или PNG до 5 МБ), возвращает { url }
export function uploadServicePhoto(file) {
  const form = new FormData()
  form.append('file', file)
  return api('/api/performer/uploads', { method: 'POST', body: form })
}

// ---- входящие заказы ----
// status: 'New' | 'Confirmed' | 'InProgress' | 'Completed' | 'Cancelled' или пусто (все)
export const getIncomingOrders = (status) =>
  api(`/api/performer/orders${status ? `?status=${status}` : ''}`)

export const confirmOrder = (id) => api(`/api/orders/${id}/confirm`, { method: 'POST' })
// reason обязательна (3–500 символов)
export const rejectOrder = (id, reason) =>
  api(`/api/orders/${id}/reject`, { method: 'POST', body: { reason } })
export const startOrder = (id) => api(`/api/orders/${id}/start`, { method: 'POST' })
export const completeOrder = (id) => api(`/api/orders/${id}/complete`, { method: 'POST' })

// ---- отзывы о мастере ----
// { rating, reviewCount, reviews: { items, page, totalPages, totalCount } }
export const getPerformerReviews = ({ page = 1, pageSize = 10 } = {}) =>
  api(`/api/performer/reviews?page=${page}&pageSize=${pageSize}`)

// ответ мастера на отзыв (до 1000 символов); возвращают обновлённый отзыв
export const replyToReview = (id, text) =>
  api(`/api/performer/reviews/${id}/reply`, { method: 'POST', body: { text } })
export const deleteReviewReply = (id) =>
  api(`/api/performer/reviews/${id}/reply`, { method: 'DELETE' })
