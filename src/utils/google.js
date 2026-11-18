// Вход через Google Identity Services (скрипт подключён в index.html).
// Вызывать нужно прямо из обработчика клика, иначе браузер заблокирует всплывающее окно.
export function requestGoogleAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    const oauth2 = window.google?.accounts?.oauth2
    if (!oauth2) {
      reject(new Error('Google ещё загружается или заблокирован. Попробуйте ещё раз'))
      return
    }

    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (resp) => (resp.error ? reject(resp) : resolve(resp.access_token)),
      error_callback: (err) => reject(err),
    })
    client.requestAccessToken({ prompt: 'select_account' })
  })
}