import { api } from './client'

export function getCatalog(params) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, value)
  }
  return api(`/api/catalog?${qs}`, { auth: false })
}

export const getCategories = () => api('/api/categories', { auth: false })

export const getService = (id) => api(`/api/catalog/${id}`, { auth: false })

export const getServiceReviews = (id, page = 1, pageSize = 10) =>
  api(`/api/catalog/${id}/reviews?page=${page}&pageSize=${pageSize}`, { auth: false })

// публичная страница мастера: { id, fullName, specialization, experienceYears, city, serviceArea,
//   bio, avatarUrl, isVerified, createdAt, rating, reviewCount, completedOrders, servicesCount }
export const getPerformer = (id) => api(`/api/performers/${id}`, { auth: false })
