import { api } from './client'

export function getCatalog(params) {
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') qs.set(key, value)
  }
  return api(`/api/catalog?${qs}`, { auth: false })
}

export const getCategories = () => api('/api/categories', { auth: false })