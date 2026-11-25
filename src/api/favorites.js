import { api } from './client'

// { services: [ServiceDto], performers: [{ id, fullName, specialization, city, avatarUrl, isVerified, rating, reviewCount, servicesCount }] }
export const getFavorites = () => api('/api/favorites')

// { serviceIds: [..], performerIds: [..] }: по ним закрашиваются сердечки на карточках
export const getFavoriteIds = () => api('/api/favorites/ids')

export const addFavoriteService = (id) => api(`/api/favorites/services/${id}`, { method: 'POST' })
export const removeFavoriteService = (id) => api(`/api/favorites/services/${id}`, { method: 'DELETE' })
export const addFavoritePerformer = (id) => api(`/api/favorites/performers/${id}`, { method: 'POST' })
export const removeFavoritePerformer = (id) => api(`/api/favorites/performers/${id}`, { method: 'DELETE' })
