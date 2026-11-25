import { api } from './client'

// все заказы текущего клиента, новые первыми
export const getMyOrders = () => api('/api/orders/my')

export const cancelOrder = (id) => api(`/api/orders/${id}/cancel`, { method: 'POST' })

// id позиций заказа, на которые клиент уже оставил отзыв, берём из этого списка
export const getMyReviews = () => api('/api/reviews/my')

// { orderItemId, rating, text }
export const createReview = (body) => api('/api/reviews', { method: 'POST', body })
// заказ одной услуги без корзины: { serviceId, quantity, desiredDate, comment, address, contactName, contactPhone }
// возвращает один заказ (не список, как оформление корзины)
export const quickOrder = (body) => api('/api/orders/quick', { method: 'POST', body })
