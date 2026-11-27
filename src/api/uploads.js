import { api } from './client'

// загрузка фото (JPG или PNG до 5 МБ) клиентом или мастером, возвращает { url }
export function uploadPhoto(file) {
  const form = new FormData()
  form.append('file', file)
  return api('/api/uploads', { method: 'POST', body: form })
}
