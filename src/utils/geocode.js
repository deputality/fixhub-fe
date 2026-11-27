// Поиск места по названию через Nominatim (OpenStreetMap), без ключа.
// Ищем по всему миру. Против «Брест нашёлся не в той стране»: показываем человеку все варианты
// с областью и страной, а не берём первый попавшийся, и ставим наверх близкие страны (PREFERRED).
//
// Правила Nominatim: не больше 1 запроса в секунду и без подсказок «на лету»,
// поэтому ищем только по Enter или кнопке.
const ENDPOINT = 'https://nominatim.openstreetmap.org/search'

// Пустая строка = весь мир. Можно ограничить, например 'by,ru' (коды ISO 3166-1 alpha-2 через запятую).
export const DEFAULT_COUNTRIES = ''

// Эти страны идут в списке первыми, остальные после них. Порядок важен.
export const PREFERRED = ['by', 'ru', 'pl', 'lt', 'lv', 'ua']

const pick = (a, keys) => keys.map((k) => a?.[k]).find(Boolean)

function toPlace(item) {
  const a = item.address ?? {}
  const name = pick(a, ['city', 'town', 'village', 'hamlet', 'municipality', 'suburb']) ?? item.name
  const region = pick(a, ['state', 'region', 'county'])
  const label = [name, region, a.country].filter(Boolean).join(', ')
  return {
    id: item.place_id,
    lat: Number(item.lat),
    lng: Number(item.lon),
    label: label || item.display_name,
    rank: PREFERRED.indexOf(a.country_code),
  }
}

export async function searchPlaces(query, { countries = DEFAULT_COUNTRIES, signal } = {}) {
  const q = query.trim()
  if (q.length < 2) return []

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '10',
    featureType: 'settlement', // города, посёлки и деревни, без улиц и магазинов
    'accept-language': 'ru',
  })
  if (countries) params.set('countrycodes', countries)

  const res = await fetch(`${ENDPOINT}?${params}`, { signal })
  if (!res.ok) throw new Error('Поиск места временно недоступен')

  const seen = new Set()
  return (await res.json())
    .map(toPlace)
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .filter((p) => (seen.has(p.label) ? false : seen.add(p.label)))
    // сначала близкие страны (по порядку PREFERRED), потом остальные; внутри группы порядок Nominatim
    .map((p, i) => ({ ...p, i }))
    .sort((x, y) => (x.rank < 0 ? 99 : x.rank) - (y.rank < 0 ? 99 : y.rank) || x.i - y.i)
    .map(({ rank, i, ...p }) => p)
}