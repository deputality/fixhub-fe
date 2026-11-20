import { api } from './client'

// { id, email, fullName, phone, bio, role }
export const getProfile = () => api('/api/profile')

// { fullName, phone, bio }
export const updateProfile = (body) => api('/api/profile', { method: 'PUT', body })
