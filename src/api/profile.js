import { api } from './client'

// { id, email, fullName, phone, bio, role,
//   specialization, experienceYears, city, serviceArea, avatarUrl, isVerified, emailNotifications }
export const getProfile = () => api('/api/profile')

// { fullName, phone, bio } и для мастера ещё { specialization, experienceYears, city, serviceArea, avatarUrl }
export const updateProfile = (body) => api('/api/profile', { method: 'PUT', body })

// присылать ли уведомления о заказах на почту
export const updateEmailNotifications = (emailNotifications) =>
  api('/api/profile/notifications', { method: 'PUT', body: { emailNotifications } })

export const changePassword = (currentPassword, newPassword) =>
  api('/api/profile/password', { method: 'POST', body: { currentPassword, newPassword } })
