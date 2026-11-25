// Leaflet подключается с CDN при первом показе карты, а не лежит в сборке:
// страницы без карты ничего лишнего не загружают.
const VERSION = '1.9.4'
const BASE = `https://unpkg.com/leaflet@${VERSION}/dist`

let pending = null

export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L)
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = `${BASE}/leaflet.css`
      css.dataset.leaflet = ''
      document.head.appendChild(css)
    }

    const script = document.createElement('script')
    script.src = `${BASE}/leaflet.js`
    script.async = true
    script.onload = () => resolve(window.L)
    script.onerror = () => {
      script.remove()
      pending = null // при следующем показе карты попробуем ещё раз
      reject(new Error('Не удалось загрузить карту'))
    }
    document.head.appendChild(script)
  })

  return pending
}
