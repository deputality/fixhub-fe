import ComplaintButton from '../../components/feedback/ComplaintButton'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BadgeCheck, Briefcase, CalendarDays, CircleAlert, ChevronRight, ClipboardCheck,
  MapPin, ShieldOff, Star, UserRound,
} from 'lucide-react'
import { getCatalog, getCategories, getPerformer } from '../../api/catalog'
import { getPerformerPortfolio } from '../../api/portfolio'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import FavoriteButton from '../../components/catalog/FavoriteButton'
import MapView from '../../components/catalog/MapView'
import ShareButton from '../../components/catalog/ShareButton'
import { useDocumentMeta } from '../../utils/useDocumentMeta'
import PortfolioGallery from '../../components/catalog/PortfolioGallery'
import { resolveCategoryMeta } from '../../utils/categoryMeta'
import Pagination from '../../components/common/Pagination'
import ServiceCard from '../../components/catalog/ServiceCard'
import './PerformerPublicPage.css'

const PAGE_SIZE = 6

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function plural(n, one, few, many) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

function yearsText(n) {
  return `${n} ${plural(n, 'год', 'года', 'лет')}`
}

function sinceText(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

// публичная страница мастера: видна всем, без телефона и почты
export default function PerformerPublicPage() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { performerIds, togglePerformer } = useFavorites()
  const servicesRef = useRef(null)

  // результат загрузки помнит, для какого мастера он получен: пока id другой, показываем загрузку
  const [loaded, setLoaded] = useState({ id: null, performer: null, error: '' })
  const [categories, setCategories] = useState([])
  const [portfolio, setPortfolio] = useState({ id: null, items: [] })
  // номер страницы услуг тоже привязан к мастеру и сбрасывается на первую при смене id
  const [pageState, setPageState] = useState({ id: null, page: 1 })
  const page = pageState.id === id ? pageState.page : 1
  const setPage = (next) => setPageState({ id, page: next })

  let state
  if (loaded.id !== id) state = { status: 'loading', performer: null, error: '' }
  else if (loaded.error) state = { status: 'error', performer: null, error: loaded.error }
  else state = { status: 'ready', performer: loaded.performer, error: '' }
  const [services, setServices] = useState({ key: null, data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    getPerformer(id)
      .then((performer) => { if (!cancelled) setLoaded({ id, performer, error: '' }) })
      .catch((err) => {
        if (!cancelled) setLoaded({ id, performer: null, error: err?.error ?? 'Не удалось загрузить профиль мастера' })
      })
    getCategories().then((c) => { if (!cancelled) setCategories(c) }).catch(() => {})
    // портфолио — дополнение к профилю: если не загрузилось, страница остаётся рабочей
    getPerformerPortfolio(id)
      .then((items) => { if (!cancelled) setPortfolio({ id, items }) })
      .catch(() => { if (!cancelled) setPortfolio({ id, items: [] }) })
    return () => { cancelled = true }
  }, [id])

  const key = `${id}|${page}`
  useEffect(() => {
    let cancelled = false
    getCatalog({ performerId: id, sort: 'Newest', page, pageSize: PAGE_SIZE })
      .then((data) => { if (!cancelled) setServices({ key, data, error: '' }) })
      .catch((err) => {
        if (!cancelled) setServices({ key, data: null, error: err?.error ?? 'Не удалось загрузить услуги' })
      })
    return () => { cancelled = true }
  }, [key, id, page])

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const perf = state.performer
  useDocumentMeta({
    title: perf
      ? `${perf.fullName} — ${perf.specialization || 'мастер'}${perf.city ? `, ${perf.city}` : ''} | FixHub`
      : '',
    description: perf
      ? [perf.specialization, [perf.city, perf.serviceArea].filter(Boolean).join(', '), perf.bio?.slice(0, 140)]
        .filter(Boolean).join('. ')
      : '',
    image: perf?.avatarUrl,
  })

  if (state.status === 'loading') {
    return <div className="container mp-page"><div className="mp-skeleton" /></div>
  }

  if (state.status === 'error') {
    return (
      <div className="container mp-page">
        <div className="form-alert"><CircleAlert size={18} />{state.error}</div>
        <Link to="/" className="btn btn-outline btn-sm mp-back">В каталог</Link>
      </div>
    )
  }

  const p = state.performer
  const loading = services.key !== key
  const data = services.data
  const place = [p.city, p.serviceArea].filter(Boolean).join(', ')

  function changePage(next) {
    setPage(next)
    servicesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="container mp-page">
      <nav className="sp-crumbs" aria-label="Навигация">
        <Link to="/">Каталог</Link>
        <ChevronRight size={14} />
        <span>{p.fullName}</span>
      </nav>

      <section className="mp-card mp-head">
        <span className="mp-ava">
          {p.avatarUrl ? <img src={p.avatarUrl} alt={p.fullName} /> : initials(p.fullName)}
        </span>

        <div className="mp-main">
          <div className="mp-title">
            <h1>{p.fullName}</h1>
            <div className="mp-title-actions">
              <ShareButton path={`/share/performers/${p.id}`} title={p.fullName} />
              <FavoriteButton
                variant="pill"
                active={performerIds.has(p.id)}
                label={p.fullName}
                onToggle={() => togglePerformer(p.id)}
              />
            </div>
          </div>
          <div className="mp-role">{p.specialization || 'Частный мастер'}</div>

          {p.isVerified ? (
            <span className="mp-badge ok"><BadgeCheck size={17} /> Проверенный специалист</span>
          ) : (
            <span className="mp-badge off"><ShieldOff size={17} /> Профиль не проверен</span>
          )}

          <ul className="mp-facts">
            {place && <li><MapPin size={16} />{place}</li>}
            {p.experienceYears != null && <li><Briefcase size={16} />Опыт {yearsText(p.experienceYears)}</li>}
            <li><CalendarDays size={16} />На FixHub с {sinceText(p.createdAt)}</li>
          </ul>

          <ComplaintButton kind="Performer" targetId={p.id} ownerId={p.id} label="Пожаловаться на мастера" className="mp-report" />
        </div>

        <div className="mp-stats">
          <div className="mp-stat">
            <b><Star size={20} fill={p.rating != null ? '#f59e0b' : 'none'} stroke={p.rating != null ? '#f59e0b' : '#cbd5e1'} />{p.rating != null ? Number(p.rating).toFixed(1) : '—'}</b>
            <span>{p.reviewCount > 0
              ? `${p.reviewCount} ${plural(p.reviewCount, 'отзыв', 'отзыва', 'отзывов')}`
              : 'Пока нет отзывов'}</span>
          </div>
          <div className="mp-stat">
            <b><ClipboardCheck size={20} className="mp-stat-ico" />{p.completedOrders}</b>
            <span>Выполнено {plural(p.completedOrders, 'заказ', 'заказа', 'заказов')}</span>
          </div>
        </div>
      </section>

      {p.bio && (
        <section className="mp-card mp-about">
          <h2><UserRound size={20} /> О мастере</h2>
          <p>{p.bio}</p>
        </section>
      )}

      {p.latitude != null && p.longitude != null && (
        <section className="mp-card mp-where">
          <h2><MapPin size={20} /> Где работает мастер</h2>
          <MapView
            height={260}
            markers={[{ id: p.id, lat: p.latitude, lng: p.longitude, title: p.fullName, subtitle: place }]}
          />
          <p className="mp-where-note">Точка показывает район, а не точный адрес мастера.</p>
        </section>
      )}

      {portfolio.id === id && portfolio.items.length > 0 && (
        <PortfolioGallery items={portfolio.items} />
      )}

      <section ref={servicesRef} className="mp-services">
        <h2>Услуги мастера{p.servicesCount > 0 && <span>{p.servicesCount}</span>}</h2>

        {services.error && !loading ? (
          <div className="form-alert"><CircleAlert size={18} />{services.error}</div>
        ) : !data ? (
          <div className="grid">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton-card" aria-hidden="true"><div className="skeleton sk-photo" /></div>)}
          </div>
        ) : data.items.length === 0 ? (
          <p className="mp-empty">У мастера пока нет опубликованных услуг.</p>
        ) : (
          <>
            <div className={`grid${loading ? ' loading' : ''}`}>
              {data.items.map((service, index) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  meta={resolveCategoryMeta(service.categoryId, byId)}
                  index={index}
                  onAdd={addToCart}
                  hideMaster
                />
              ))}
            </div>
            <Pagination page={page} totalPages={data.totalPages} onChange={changePage} />
          </>
        )}
      </section>
    </div>
  )
}
