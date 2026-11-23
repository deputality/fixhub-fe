import { api } from './client'

export const login = (email, password) =>
  api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })

export const register = (data) =>
  api('/api/auth/register', { method: 'POST', body: data, auth: false })

// accessToken получаем от Google, role нужна только при первой регистрации
export const googleLogin = (accessToken, role) =>
  api('/api/auth/google', { method: 'POST', body: { accessToken, role }, auth: false })

// отправляет письмо со ссылкой; ответ всегда одинаковый, есть такой email или нет
export const forgotPassword = (email) =>
  api('/api/auth/forgot-password', { method: 'POST', body: { email }, auth: false })

// token берём из ссылки в письме
export const resetPassword = (token, newPassword) =>
  api('/api/auth/reset-password', { method: 'POST', body: { token, newPassword }, auth: false })
