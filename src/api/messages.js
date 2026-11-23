import { api } from './client'

// переписка по заказу (последние 200 сообщений); заодно помечает сообщения собеседника прочитанными
export const getOrderMessages = (orderId) => api(`/api/orders/${orderId}/messages`)

export const sendOrderMessage = (orderId, text) =>
  api(`/api/orders/${orderId}/messages`, { method: 'POST', body: { text } })

// [{ orderId, count }]: непрочитанные сообщения по чатам
export const getUnreadChats = () => api('/api/orders/messages/unread')
