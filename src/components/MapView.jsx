import { useEffect, useRef, useState } from 'react'
import { loadLeaflet } from '../utils/leaflet'
import './MapView.css'

const DEFAULT_CENTER = [53.9, 27.5667]

// стандартные тайлы OSM без ключа; светлый «фирменный» вид даёт CSS-фильтр в MapView.css
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'

// пины: капля с градиентом, рябь «от земли», тень; задержка --d нужна для каскадного появления
function pinIcon(L, kind, delay = 0) {
  const style = `--d:${delay}ms`
  if (kind === 'me') {
    return L.divIcon({
      className: 'map-icon',
      html: `<span class="map-me" style="${style}"><i class="map-me-ring"></i><i class="map-me-ring map-me-ring-2"></i><i class="map-me-dot"></i></span>`,
      iconSize: [28, 28], iconAnchor: [14, 14],
    })
  }
  const cls = kind === 'picked' ? 'map-pin map-pin-picked' : 'map-pin'
  return L.divIcon({
    className: 'map-icon',
    html: `<span class="${cls}" style="${style}"><i class="map-pin-ring"></i><i class="map-pin-ring map-pin-ring-2"></i><i class="map-pin-shadow"></i><span class="map-pin-float"><i class="map-pin-body"></i><i class="map-pin-dot"></i></span></span>`,
    iconSize: [36, 44], iconAnchor: [18, 40], popupAnchor: [0, -38], tooltipAnchor: [0, -38],
  })
}

// плавно подлетаем к маркеру, сдвигая центр вверх: так попап целиком помещается на карте
function focusOn(map, latlng, calm) {
  const z = Math.max(map.getZoom(), 13)
  const target = map.unproject(map.project(latlng, z).subtract([0, 70]), z)
  if (calm) map.setView(target, z, { animate: false })
  else map.flyTo(target, z, { duration: 0.9, easeLinearity: 0.3 })
}

// Всплывающее окно строим через DOM, а не строкой: имена мастеров приходят с сервера
function popupNode(marker, onOpen) {
  const box = document.createElement('div')
  box.className = 'map-popup'

  const title = document.createElement('b')
  title.textContent = marker.title
  box.appendChild(title)

  if (marker.subtitle) {
    const sub = document.createElement('span')
    sub.className = 'map-popup-sub'
    sub.textContent = marker.subtitle
    box.appendChild(sub)
  }

  if (onOpen && marker.href) {
    const link = document.createElement('a')
    link.href = marker.href
    link.textContent = marker.linkText ?? 'Открыть'
    link.addEventListener('click', (e) => {
      e.preventDefault()
      onOpen(marker)
    })
    box.appendChild(link)
  }
  return box
}

// markers: [{ id, lat, lng, title, subtitle?, href?, linkText? }]
// user: { lat, lng } — точка самого пользователя
// picked + onPick: режим выбора точки кликом по карте
export default function MapView({
  markers = [], user = null, picked = null, onPick, onOpen,
  height = 320, zoom = 12, className = '',
}) {
  const elRef = useRef(null)
  const ctx = useRef(null)
  const latest = useRef({})
  const [status, setStatus] = useState('loading')
  const picking = Boolean(onPick)

  // обработчики и данные читаем из ref, чтобы карта не пересоздавалась при каждом рендере
  useEffect(() => {
    latest.current = { markers, user, picked, onPick, onOpen, zoom }
  })

  useEffect(() => {
    let cancelled = false
    let map = null

    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current) return
        map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: false, attributionControl: false, zoomSnap: 0.5 }).setView(DEFAULT_CENTER, 11)
        L.tileLayer(TILES, { maxZoom: 19 }).addTo(map)
        L.control.zoom({ position: 'bottomright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map)
        L.control.attribution({ position: 'bottomleft', prefix: false }).addAttribution(ATTRIBUTION).addTo(map)
        map.on('click', (e) => latest.current.onPick?.(e.latlng.lat, e.latlng.lng))
        // колесо мыши включаем только после клика по карте, чтобы она не перехватывала прокрутку страницы
        map.once('click', () => map.scrollWheelZoom.enable())
        ctx.current = { L, map, layer: L.layerGroup().addTo(map) }
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })

    return () => {
      cancelled = true
      ctx.current = null
      map?.remove()
    }
  }, [])

  // ключ нужен, чтобы не перерисовывать карту и не сбрасывать масштаб, когда данные те же
  const key = JSON.stringify([
    markers.map((m) => [m.id, m.lat, m.lng, m.title]),
    user && [user.lat, user.lng],
    picked && [picked.lat, picked.lng],
  ])

  useEffect(() => {
    if (status !== 'ready' || !ctx.current) return
    const { L, map, layer } = ctx.current
    const { markers: list, user: me, picked: pick, onOpen: open, zoom: z } = latest.current

    layer.clearLayers()
    const points = []

    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const fly = calm ? { animate: false } : { duration: 1.4, easeLinearity: 0.25 }

    list.forEach((m, i) => {
      const marker = L.marker([m.lat, m.lng], { icon: pinIcon(L, 'pin', 350 + Math.min(i * 60, 700)), riseOnHover: true, alt: m.title })
        .bindPopup(popupNode(m, open), { autoPan: false, minWidth: 170 })
        .bindTooltip(m.title, { direction: 'top', className: 'map-tip', opacity: 1 })
        .addTo(layer)
      marker.on('click', () => focusOn(map, marker.getLatLng(), calm))
      marker.on('popupopen', () => { marker.closeTooltip(); marker.getElement()?.classList.add('is-active') })
      marker.on('popupclose', () => marker.getElement()?.classList.remove('is-active'))
      marker.on('tooltipopen', () => { if (marker.isPopupOpen()) marker.closeTooltip() })
      points.push([m.lat, m.lng])
    })

    if (me) {
      L.marker([me.lat, me.lng], { icon: pinIcon(L, 'me', 200), interactive: false, keyboard: false }).addTo(layer)
      points.push([me.lat, me.lng])
    }

    if (pick) {
      L.marker([pick.lat, pick.lng], { icon: pinIcon(L, 'picked', 0), keyboard: false }).addTo(layer)
      if (map.getZoom() < 13) map.flyTo([pick.lat, pick.lng], 13, fly)
      else map.panTo([pick.lat, pick.lng], { animate: !calm, duration: 0.6 })
    } else if (points.length === 1) {
      map.flyTo(points[0], z + 1, fly)
    } else if (points.length > 1) {
      map.flyToBounds(points, { padding: [56, 56], maxZoom: 14, ...fly })
    }
  }, [status, key])

  // подсветка следует за курсором (CSS-переменные, без перерисовок React)
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const cls = ['map-view', status === 'ready' && 'is-ready', picking && 'is-picking', className].filter(Boolean).join(' ')

  return (
    <div className={cls} style={{ height }} onMouseMove={onMove}>
      <div ref={elRef} className="map-canvas" />
      <div className={`map-state ${status === 'ready' ? 'is-done' : ''} ${status === 'error' ? 'is-error' : ''}`} role={status === 'error' ? 'alert' : undefined}>
        {status === 'error'
          ? 'Карта не загрузилась. Проверьте интернет и обновите страницу.'
          : (<><span className="map-loader" aria-hidden="true"><i /><i /><i /></span>Загружаем карту…</>)}
      </div>
      {picking && status === 'ready' && !picked && <div className="map-hint"><i />Нажмите на карту, чтобы отметить место</div>}
    </div>
  )
}
