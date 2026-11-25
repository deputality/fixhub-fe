import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, CircleAlert, Heart, MapPin, Star } from 'lucide-react'
import { getFavorites } from '../api/favorites'
import { getCategories } from '../api/catalog'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import { useAuthGuard } from '../utils/useAuthGuard'
import FavoriteButton from '../components/FavoriteButton'
import ServiceCard from '../components/ServiceCard'
import './FavoritesPage.css'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function PerformerCard({ performer, active, onToggle }) {
  return (
    <article className="fv-master">
      <FavoriteButton className="fv-master-fav" active={active} label={performer.fullName} onToggle={onToggle} />
      <Link to={`/performers/${performer.id}`} className="fv-master-link">
        <span className="fv-ava">
          {performer.avatarUrl ? <img src={performer.avatarUrl} alt="" loading="lazy" /> : initials(performer.fullName)}
        </span>
        <span className="fv-master-name">
          {performer.fullName}
          {performer.isVerified && <BadgeCheck size={16} className="master-ok" aria-label="Проверенный мастер" />}
        </span>
        <span className="fv-master-role">{performer.specialization || 'Частный мастер'}</span>
        <span className="fv-master-facts">
          <span>
            <Star size={14} fill={performer.rating != null ? '#f59e0b' : 'none'} stroke={performer.rating != null ? '#f59e0b' : '#cbd5e1'} />
            {performer.rating != null ? `${Number(performer.rating).toFixed(1)} (${performer.reviewCount})` : 'Пока нет отзывов'}
          </span>
          {performer.city && <span><MapPin size={14} />{performer.city}</span>}
        </span>
      </Link>
    </article>
  )
}

export default function FavoritesPage() {
  const guard = useAuthGuard()
  const { addToCart } = useCart()
  const { ready, serviceIds, performerIds, togglePerformer } = useFavorites()

  const [tab, setTab] = useState('services')
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [categories, setCategories] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([getFavorites(), getCategories().catch(() => [])])
      .then(([data, cats]) => {
        if (cancelled) return
        setCategories(cats)
        setState({ status: 'ready', data, error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', data: null, error: err?.error ?? 'Не удалось загрузить избранное' })
      })
    return () => { cancelled = true }
  }, [guard])

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  // карточка пропадает сразу после нажатия на сердечко: список берём из загруженного,
  // а актуальность проверяем по набору избранного в памяти
  const services = (state.data?.services ?? []).filter((s) => !ready || serviceIds.has(s.id))
  const performers = (state.data?.performers ?? []).filter((p) => !ready || performerIds.has(p.id))

  const list = tab === 'services' ? services : performers

  return (
    <div className="fv">
      <header className="fv-head">
        <h1>Избранное</h1>
        <p>Услуги и мастера, к которым вы хотите вернуться.</p>
      </header>

      <div className="fv-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'services'}
          className={tab === 'services' ? 'active' : ''} onClick={() => setTab('services')}>
          Услуги<span>{services.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'performers'}
          className={tab === 'performers' ? 'active' : ''} onClick={() => setTab('performers')}>
          Мастера<span>{performers.length}</span>
        </button>
      </div>

      {state.status === 'loading' && (
        <div className="grid" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton-card"><div className="skeleton sk-photo" /></div>)}
        </div>
      )}

      {state.status === 'error' && (
        <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>
      )}

      {state.status === 'ready' && list.length === 0 && (
        <div className="empty">
          <Heart size={42} strokeWidth={1.5} />
          <h3>{tab === 'services' ? 'Нет сохранённых услуг' : 'Нет сохранённых мастеров'}</h3>
          <p>Нажмите на сердечко {tab === 'services' ? 'на карточке услуги' : 'на странице мастера'}, и она появится здесь</p>
          <Link to="/" className="btn btn-primary btn-sm">Открыть каталог</Link>
        </div>
      )}

      {state.status === 'ready' && tab === 'services' && services.length > 0 && (
        <div className="grid">
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              meta={resolveCategoryMeta(service.categoryId, byId)}
              index={index}
              onAdd={addToCart}
            />
          ))}
        </div>
      )}

      {state.status === 'ready' && tab === 'performers' && performers.length > 0 && (
        <div className="fv-masters">
          {performers.map((p) => (
            <PerformerCard key={p.id} performer={p} active={!ready || performerIds.has(p.id)} onToggle={() => togglePerformer(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
