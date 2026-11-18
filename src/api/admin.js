import { api } from './client'

export const getAdminStats = () => api('/api/admin/stats')

// заказы по дням за последние N дней, дни без заказов приходят с нулём
export const getOrdersByDay = (days) => api(`/api/admin/stats/orders-by-day?days=${days}`)

export function getAdminUsers({ search, page, pageSize }) {
  const qs = new URLSearchParams({ page, pageSize })
  if (search) qs.set('search', search)
  return api(`/api/admin/users?${qs}`)
}

export const blockUser = (id) => api(`/api/admin/users/${id}/block`, { method: 'POST' })

export const unblockUser = (id) => api(`/api/admin/users/${id}/unblock`, { method: 'POST' })