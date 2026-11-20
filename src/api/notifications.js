import { api } from './client'

export const getUnreadCount = () => api('/api/notifications/unread-count')
export const getNotifications = (pageSize = 8) => api(`/api/notifications?page=1&pageSize=${pageSize}`)
export const markNotificationRead = (id) => api(`/api/notifications/${id}/read`, { method: 'POST' })
export const markAllNotificationsRead = () => api('/api/notifications/read-all', { method: 'POST' })
