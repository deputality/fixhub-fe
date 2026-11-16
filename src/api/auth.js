import { api } from './client'

export const login = (email, password) =>
  api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false })

export const register = (data) =>
  api('/api/auth/register', { method: 'POST', body: data, auth: false })