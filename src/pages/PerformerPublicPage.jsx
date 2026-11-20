import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BadgeCheck, Briefcase, CalendarDays, CircleAlert, ChevronRight, ClipboardCheck,
  MapPin, ShieldOff, Star, UserRound,
} from 'lucide-react'
import { getCatalog, getCategories, getPerformer } from '../api/catalog'
import { useCart } from '../context/CartContext'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import Pagination from '../components/Pagination'
import ServiceCard from '../components/ServiceCard'
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
  const servicesRef = useRef(null)

  const [state, setState] = useState({ status: 'loading', performer: null, error: '' })
  const [categories, setCategories] = useState([])
  const [page, setPage] = useState(1)
  const [services, setServices] = useState({ key: null, data: null, error: '' })

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading', performer: null, error: '' })
    setPage(1)
    getPerformer(id)
      .then((performer) => { if (!cancelled) setState({ status: 'ready', performer, error: '' }) })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', performer: null, error: err?.error ?? 'Не удалось загрузить профиль мастера' })
      })
    getCategories().then((c) => { if (!cancelled) setCategories(c) }).catch(() => {})
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
          <h1>{p.fullName}</h1>
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
        </div>

        <div className="mp-stats">
          <div className="mp-stat">
            <b><Star size={20} fill="#f59e0b" stroke="#f59e0b" />{p.rating != null ? Number(p.rating).toFixed(1) : '—'}</b>
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
