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

// isHidden: true, false или undefined (все отзывы)
export function getAdminReviews({ isHidden, page, pageSize }) {
  const qs = new URLSearchParams({ page, pageSize })
  if (isHidden !== undefined) qs.set('isHidden', isHidden)
  return api(`/api/admin/reviews?${qs}`)
}

export const hideReview = (id) => api(`/api/admin/reviews/${id}/hide`, { method: 'POST' })

export const showReview = (id) => api(`/api/admin/reviews/${id}/show`, { method: 'POST' })

// все категории, включая скрытые, с числом услуг и исполнителей
export const getAdminCategories = () => api('/api/admin/categories')

export const hideCategory = (id) => api(`/api/admin/categories/${id}/hide`, { method: 'POST' })

export const showCategory = (id) => api(`/api/admin/categories/${id}/show`, { method: 'POST' })

// body: { name, parentId }
export const createCategory = (body) => api('/api/categories', { method: 'POST', body })

export const updateCategory = (id, body) => api(`/api/categories/${id}`, { method: 'PUT', body })

export const deleteCategory = (id) => api(`/api/categories/${id}`, { method: 'DELETE' })
