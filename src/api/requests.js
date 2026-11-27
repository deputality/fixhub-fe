import { api } from './client'

// ---- клиент ----
// { categoryId, title, description, address, contactName, contactPhone, desiredDate }
export const createRequest = (body) => api('/api/requests', { method: 'POST', body })
export const getMyRequests = () => api('/api/requests/my')
// запрос вместе с предложениями мастеров: { ...request, offers: [...] }
export const getRequest = (id) => api(`/api/requests/${id}`)
export const cancelRequest = (id) => api(`/api/requests/${id}/cancel`, { method: 'POST' })
// выбрать предложение: { request, order }
export const acceptOffer = (requestId, offerId) =>
  api(`/api/requests/${requestId}/offers/${offerId}/accept`, { method: 'POST' })

// ---- мастер ----
export const getPerformerRequests = () => api('/api/performer/requests')
// { serviceId, price, message }
export const saveOffer = (requestId, body) =>
  api(`/api/performer/requests/${requestId}/offer`, { method: 'PUT', body })
export const withdrawOffer = (requestId) =>
  api(`/api/performer/requests/${requestId}/offer`, { method: 'DELETE' })
