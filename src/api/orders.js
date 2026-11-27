import { api } from './client'

// все заказы текущего клиента, новые первыми
export const getMyOrders = () => api('/api/orders/my')

// reason обязательна (3–500 символов)
export const cancelOrder = (id, reason) =>
  api(`/api/orders/${id}/cancel`, { method: 'POST', body: { reason } })

// «Заказать снова»: позиции заказа попадают в корзину, возвращает { added, skipped: [названия] }
export const repeatOrder = (id) => api(`/api/orders/${id}/repeat`, { method: 'POST' })

// id позиций заказа, на которые клиент уже оставил отзыв, берём из этого списка
export const getMyReviews = () => api('/api/reviews/my')

// { orderItemId, rating, text, photoUrls }
export const createReview = (body) => api('/api/reviews', { method: 'POST', body })
// заказ одной услуги без корзины: { serviceId, quantity, desiredDate, desiredTime, comment, address, contactName, contactPhone }
// возвращает один заказ (не список, как оформление корзины)
export const quickOrder = (body) => api('/api/orders/quick', { method: 'POST', body })

// один заказ с историей статусов: history: [{ fromStatus, toStatus, changedByName, changedAt, reason }]
export const getOrder = (id) => api(`/api/orders/${id}`)
