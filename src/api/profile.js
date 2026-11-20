import { api } from './client'

// { id, email, fullName, phone, bio, role,
//   specialization, experienceYears, city, serviceArea, avatarUrl, isVerified }
export const getProfile = () => api('/api/profile')

// { fullName, phone, bio } и для мастера ещё { specialization, experienceYears, city, serviceArea, avatarUrl }
export const updateProfile = (body) => api('/api/profile', { method: 'PUT', body })
