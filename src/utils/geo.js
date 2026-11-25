// Определяет положение через браузер. Координаты нужны только для запроса к каталогу
// и в профиль не сохраняются, пока человек сам не нажмёт «Сохранить».
export function getUserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Браузер не умеет определять местоположение'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const messages = {
          1: 'Нет доступа к местоположению. Разрешите его в настройках браузера',
          2: 'Не удалось определить местоположение',
          3: 'Определение местоположения заняло слишком много времени',
        }
        reject(new Error(messages[err.code] ?? 'Не удалось определить местоположение'))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    )
  })
}

// ~1 км: такой же точности хватает серверу, а в адресной строке ссылка получается короткой
export const roundCoord = (value) => Math.round(value * 100) / 100

export function formatDistance(km) {
  if (km == null) return ''
  if (km < 1) return `${Math.max(1, Math.round(km * 10) * 100)} м`
  return `${km.toLocaleString('ru-RU', { maximumFractionDigits: 1 })} км`
}
