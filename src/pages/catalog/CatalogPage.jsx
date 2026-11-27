import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CircleAlert, List, Map as MapIcon, Search, SearchX } from 'lucide-react'
import { getCatalog, getCategories, getLocations } from '../../api/catalog'
import { useCart } from '../../context/CartContext'
import { useToast } from '../../context/ToastContext'
import { resolveCategoryMeta } from '../../utils/categoryMeta'
import { getUserPosition, roundCoord } from '../../utils/geo'
import { useDocumentMeta } from '../../utils/useDocumentMeta'
import Button from '../../components/common/Button'
import Filters from '../../components/catalog/Filters'
import MapView from '../../components/catalog/MapView'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import ServiceCard from '../../components/catalog/ServiceCard'

const PAGE_SIZE = 6
// на карте показываем сразу много мастеров, постраничность там не нужна (максимум, который отдаёт API)
const MAP_PAGE_SIZE = 50

const SORTS = [
  { value: 'RatingDesc', label: 'Сначала популярные' },
  { value: 'Newest', label: 'Сначала новые' },
  { value: 'PriceAsc', label: 'Сначала дешёвые' },
  { value: 'PriceDesc', label: 'Сначала дорогие' },
  { value: 'TitleAsc', label: 'По названию' },
]
const NEAREST = { value: 'Distance', label: 'Сначала ближайшие' }

function HeroSearch({ initial, onSearch }) {
  const [value, setValue] = useState(initial)

  return (
    <form
      className="hero-search"
      onSubmit={(e) => {
        e.preventDefault()
        onSearch(value)
      }}
    >
      <label className="search-field">
        <Search size={22} />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Какая услуга нужна?"
          maxLength={100}
        />
      </label>
      <button type="submit">Найти</button>
    </form>
  )
}

export default function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const { addToCart } = useCart()
  const { show } = useToast()
  const navigate = useNavigate()
  const listRef = useRef(null)

  const q = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const min = params.get('min') ?? ''
  const max = params.get('max') ?? ''
  const rating = params.get('rating') ?? ''
  const place = params.get('place') ?? ''
  const radius = params.get('radius') ?? ''
  const mapView = params.get('view') === 'map'
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  // точка пользователя считается заданной, только если обе координаты числа
  const hasGeo = params.has('lat') && params.has('lng') && Number.isFinite(lat) && Number.isFinite(lng)
  // «Сначала ближайшие» без точки на карте сервер не примет
  const rawSort = params.get('sort') ?? 'RatingDesc'
  const sort = rawSort === 'Distance' && !hasGeo ? 'RatingDesc' : rawSort
  const page = mapView ? 1 : Number(params.get('page')) || 1
  const key = params.toString()

  const [categories, setCategories] = useState([])
  const [places, setPlaces] = useState([])
  const [locating, setLocating] = useState(false)
  const [bounds, setBounds] = useState(null)
  const [result, setResult] = useState({ key: null, data: null, error: '' })

  // категории для чипов и фильтра
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
    getLocations().then(setPlaces).catch(() => {})
  }, [])

  useDocumentMeta({
    title: place ? `Услуги мастеров: ${place} | FixHub` : '',
    description: place ? `Проверенные мастера и услуги: ${place}. Сравнивайте цены и отзывы на FixHub.` : '',
  })

  // границы цены: самая дешёвая и самая дорогая услуга
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCatalog({ sort: 'PriceAsc', pageSize: 1 }),
      getCatalog({ sort: 'PriceDesc', pageSize: 1 }),
    ])
      .then(([lowest, highest]) => {
        if (cancelled) return
        const lo = lowest.items[0] ? Math.floor(lowest.items[0].price) : 0
        const hi = highest.items[0] ? Math.ceil(highest.items[0].price) : 1000
        setBounds({ min: lo, max: Math.max(hi, lo + 1) })
      })
      .catch(() => { if (!cancelled) setBounds({ min: 0, max: 1000 }) })
    return () => { cancelled = true }
  }, [])

  // загрузка каталога при любом изменении адреса
  useEffect(() => {
    let cancelled = false
    getCatalog({
      search: q,
      categoryId: category,
      minPrice: min,
      maxPrice: max,
      minRating: rating,
      location: place,
      lat: hasGeo ? lat : '',
      lng: hasGeo ? lng : '',
      radiusKm: hasGeo ? radius : '',
      sort,
      page,
      pageSize: mapView ? MAP_PAGE_SIZE : PAGE_SIZE,
    })
      .then((data) => { if (!cancelled) setResult({ key, data, error: '' }) })
      .catch((err) => {
        if (!cancelled) {
          setResult({ key, data: null, error: err.error ?? 'Не удалось загрузить каталог' })
        }
      })
    return () => { cancelled = true }
  }, [key, q, category, min, max, rating, place, hasGeo, lat, lng, radius, mapView, sort, page])

  const byId = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  )
  const roots = categories.filter((c) => !c.parentId)
  const priceBounds = bounds ?? { min: 0, max: 1000 }

  const loading = result.key !== key
  const data = result.data

  // меняет параметры адреса; страница сбрасывается, если её не передали
  function update(changes) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value === '' || value === null || value === undefined) next.delete(name)
      else next.set(name, value)
    }
    if (!('page' in changes)) next.delete('page')
    setParams(next)
  }

  function changePage(nextPage) {
    update({ page: nextPage })
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function resetFilters() {
    update({ category: '', min: '', max: '', rating: '', place: '', radius: '' })
  }

  async function locate() {
    setLocating(true)
    try {
      const pos = await getUserPosition()
      update({ lat: roundCoord(pos.lat), lng: roundCoord(pos.lng), sort: 'Distance' })
    } catch (err) {
      show(err.message, 'error')
    } finally {
      setLocating(false)
    }
  }

  function clearNear() {
    update({ lat: '', lng: '', radius: '', sort: rawSort === 'Distance' ? '' : rawSort })
  }

  // мастера на карте: одна точка на мастера, даже если у него несколько услуг в выдаче
  const mapMarkers = useMemo(() => {
    const byPerformer = new Map()
    for (const s of result.data?.items ?? []) {
      if (s.performerLatitude == null || s.performerLongitude == null) continue
      const entry = byPerformer.get(s.performerId) ?? { count: 0, service: s }
      entry.count += 1
      byPerformer.set(s.performerId, entry)
    }
    return [...byPerformer.values()].map(({ count, service: s }) => ({
      id: s.performerId,
      lat: s.performerLatitude,
      lng: s.performerLongitude,
      title: s.performerName,
      subtitle: [s.performerSpecialization, s.performerCity, `услуг: ${count}`].filter(Boolean).join(' · '),
      href: `/performers/${s.performerId}`,
      linkText: 'Профиль и услуги',
    }))
  }, [result.data])

  let content
  if (result.error && !loading) {
    content = (
      <div className="form-alert" role="alert">
        <CircleAlert size={18} />
        <span>{result.error}. Проверь, что бэкенд запущен, и обнови страницу.</span>
      </div>
    )
  } else if (!data) {
    content = (
      <div className="grid">
       {Array.from({ length: PAGE_SIZE }, (_, i) => (
          <div key={i} className="skeleton-card" aria-hidden="true">
             <div className="skeleton sk-photo" />
             <div className="sk-body">
                <div className="skeleton sk-line" />
                <div className="skeleton sk-line short" />
                <div className="skeleton sk-line tiny" />
    </div>
  </div>
))}
      </div>
    )
  } else if (data.items.length === 0) {
    content = (
      <div className="empty">
        <SearchX size={44} strokeWidth={1.5} />
        <h3>Ничего не найдено</h3>
        <p>Попробуйте изменить запрос или сбросить фильтры</p>
        <Button variant="outline" onClick={() => setParams(new URLSearchParams())}>
          Сбросить всё
        </Button>
      </div>
    )
  } else {
    content = (
      <div className={`grid${loading ? ' loading' : ''}`}>
        {data.items.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            meta={resolveCategoryMeta(service.categoryId, byId)}
            index={index}
            onAdd={addToCart}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-text">
            <h1>Найдите надёжного мастера рядом</h1>
            <p>Быстрый поиск проверенных специалистов для решения ваших бытовых и повседневных задач.</p>
            <HeroSearch key={q} initial={q} onSearch={(value) => update({ q: value.trim() })} />
          </div>

          <div className="hero-visual">
            <img
              src="/hero-master.png"
              alt=""
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <div className="hero-note-box">
              <p>Проверенные мастера рядом с вами</p>
              <svg viewBox="0 0 60 50" fill="none" aria-hidden="true">
                <path
                  d="M46 4 C46 24 30 38 10 42 M10 42 L22 32 M10 42 L23 49"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="chips">
          {roots.map((c) => {
            const meta = resolveCategoryMeta(c.id, byId)
            const Icon = meta.icon
            const active = category === String(c.id)
            return (
              <button
                key={c.id}
                type="button"
                className={`chip${active ? ' active' : ''}`}
                aria-pressed={active}
                onClick={() => update({ category: active ? '' : String(c.id) })}
              >
                <span className="chip-icon" style={{ '--c': meta.color }}>
                  <Icon size={22} />
                </span>
                <span className="chip-name">{c.name}</span>
              </button>
            )
          })}
        </div>

        <div className="catalog-layout">
          <aside>
            <Filters
              key={`${bounds ? 'ready' : 'wait'}-${key}`}
              categories={categories}
              bounds={priceBounds}
              applied={{ category, min, max, rating, place, radius }}
              onApply={update}
              onReset={resetFilters}
              places={places}
              near={{ active: hasGeo, locating }}
              onLocate={locate}
              onClearNear={clearNear}
            />
          </aside>

          <section ref={listRef} className="catalog-main">
            <div className="catalog-top">
              <span className="found">{data ? <>Найдено: <b>{data.totalCount}</b></> : ''}</span>
              <div className="catalog-tools">
                <div className="view-toggle" role="group" aria-label="Вид каталога">
                  <button type="button" className={mapView ? '' : 'active'} aria-pressed={!mapView} onClick={() => update({ view: '' })}>
                    <List size={16} /> Списком
                  </button>
                  <button type="button" className={mapView ? 'active' : ''} aria-pressed={mapView} onClick={() => update({ view: 'map' })}>
                    <MapIcon size={16} /> На карте
                  </button>
                </div>
                <Select
                  className="sort"
                  value={sort}
                  onChange={(value) => update({ sort: value })}
                  options={hasGeo ? [NEAREST, ...SORTS] : SORTS}
                  ariaLabel="Сортировка"
                />
              </div>
            </div>

            {mapView && data && (
              <div className="catalog-map">
                <MapView
                  markers={mapMarkers}
                  user={hasGeo ? { lat, lng } : null}
                  onOpen={(marker) => navigate(marker.href)}
                  height={380}
                />
                <p className="map-note">
                  {mapMarkers.length === 0
                    ? 'У найденных мастеров не указано место на карте.'
                    : 'Показаны мастера, которые указали своё место на карте (с точностью до района).'}
                  {data.totalCount > MAP_PAGE_SIZE && ` Выведены первые ${MAP_PAGE_SIZE} из ${data.totalCount}, уточните поиск.`}
                </p>
              </div>
            )}

            {content}

            {data && !mapView && <Pagination page={page} totalPages={data.totalPages} onChange={changePage} />}
          </section>
        </div>
      </div>
    </>
  )
}