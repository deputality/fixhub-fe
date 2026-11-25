import { api } from './client'

// Публичный список работ мастера: [{ id, title, description, beforeUrl, afterUrl, createdAt }]
export const getPerformerPortfolio = (performerId) =>
  api(`/api/performers/${performerId}/portfolio`, { auth: false })

// ---- управление своим портфолио (мастер) ----
export const getMyPortfolio = () => api('/api/performer/portfolio')

// body: { title, description, beforeUrl, afterUrl }; адреса фото берутся из uploadServicePhoto
export const createPortfolioItem = (body) => api('/api/performer/portfolio', { method: 'POST', body })
export const updatePortfolioItem = (id, body) => api(`/api/performer/portfolio/${id}`, { method: 'PUT', body })
export const deletePortfolioItem = (id) => api(`/api/performer/portfolio/${id}`, { method: 'DELETE' })
