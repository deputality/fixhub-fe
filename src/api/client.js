export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'

  const token = localStorage.getItem('token')
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (res.status === 401 && auth) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    throw data ?? { status: res.status, error: 'Ошибка запроса' }
  }
  return data
}