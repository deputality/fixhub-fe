import { api } from './client'

// { isVerified, documents: [{ id, kind, fileName, sizeBytes, contentType, uploadedAt }] }
export const getVerification = () => api('/api/performer/verification')

export function uploadVerificationDocument(file, kind) {
  const form = new FormData()
  form.append('file', file)
  form.append('kind', kind)
  return api('/api/performer/verification/documents', { method: 'POST', body: form })
}

export const deleteVerificationDocument = (id) =>
  api(`/api/performer/verification/documents/${id}`, { method: 'DELETE' })

// Документы закрыты: файл отдаётся только с токеном, поэтому обычная ссылка не подойдёт.
// Скачиваем файл с токеном и открываем его в новой вкладке.
export async function openVerificationDocument(id) {
  // окно открываем сразу, пока идёт клик, иначе браузер заблокирует всплывающее окно
  const tab = window.open('', '_blank')
  try {
    const res = await fetch(`/api/verification/documents/${id}/file`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      throw data ?? { error: 'Не удалось открыть документ' }
    }
    const url = URL.createObjectURL(await res.blob())
    if (tab) tab.location.href = url
    else window.location.href = url
    setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1000)
  } catch (err) {
    tab?.close()
    throw err
  }
}
