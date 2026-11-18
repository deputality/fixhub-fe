import { api } from './client'

// все заказы текущего клиента, новые первыми
export const getMyOrders = () => api('/api/orders/my')

export const cancelOrder = (id) => api(`/api/orders/${id}/cancel`, { method: 'POST' })

// id позиций заказа, на которые клиент уже оставил отзыв, берём из этого списка
export const getMyReviews = () => api('/api/reviews/my')

// { orderItemId, rating, text }
export const createReview = (body) => api('/api/reviews', { method: 'POST', body })