import ComplaintButton from '../components/ComplaintButton'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  BadgeCheck, Briefcase, Camera, ChevronRight, CircleAlert, Droplet, MapPin,
  Minus, Plus, ShieldCheck, ShieldOff, ShoppingCart, Star, Zap,
} from 'lucide-react'
import { getCategories, getService, getServiceReviews } from '../api/catalog'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { useToast } from '../context/ToastContext'
import FavoriteButton from '../components/FavoriteButton'
import MapView from '../components/MapView'
import QuickOrderModal from '../components/QuickOrderModal'
import SlotPicker from '../components/SlotPicker'
import { ReviewPhotos, ReviewReply } from '../components/ReviewExtras'
import ShareButton from '../components/ShareButton'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import { useDocumentMeta } from '../utils/useDocumentMeta'
import Button from '../components/Button'
import './ServicePage.css'

const MAX_QTY = 99
const PREVIEW_REVIEWS = 3
const UNITS = { Hour: 'час', Piece: 'шт.' }

// Блок «преимуществ» под описанием. В базе таких данных пока нет —
// поменяй тексты здесь или убери блок целиком.
const PERKS = [
  { icon: Briefcase, title: 'Опыт работы', text: '5 лет' },
  { icon: Droplet, title: 'Эко-средства', text: 'В работе' },
  { icon: ShieldCheck, title: 'Гарантия качества', text: '100%' },
]

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function todayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function Stars({ value, size = 16 }) {
  return (
    <span className="stars" aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          fill={n <= value ? '#f59e0b' : 'none'}
          stroke={n <= value ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
    </span>
  )
}

export default function ServicePage() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { serviceIds, toggleService } = useFavorites()
  const { user } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading', service: null, error: '' })
  const [categories, setCategories] = useState([])
  const [reviews, setReviews] = useState({ items: [], total: 0, page: 0, loading: false })
  const [imageFailed, setImageFailed] = useState(false)

  const [quantity, setQuantity] = useState(1)
  const [date, setDate] = useState(todayIso)
  const [time, setTime] = useState('')
  const [needTime, setNeedTime] = useState(false)
  const [comment, setComment] = useState('')
  const [adding, setAdding] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)

  const minDate = useMemo(() => todayIso(), [])

  // услуга + категории + первые отзывы
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getService(id),
      getCategories().catch(() => []),
      getServiceReviews(id, 1, PREVIEW_REVIEWS).catch(() => null),
    ])
      .then(([service, cats, revs]) => {
        if (cancelled) return
        setCategories(cats)
        setState({ status: 'ready', service, error: '' })
        if (revs) setReviews({ items: revs.items, total: revs.totalCount, page: 1, loading: false })
      })
      .catch((err) => {
        if (cancelled) return
        setState({ status: 'error', service: null, error: err?.error ?? 'Не удалось загрузить услугу' })
      })
    return () => { cancelled = true }
  }, [id])

  const { service } = state

  useDocumentMeta({
    title: service ? `${service.title} — ${service.performerName} | FixHub` : '',
    description: service
      ? `${service.categoryName}${service.performerCity ? `, ${service.performerCity}` : ''}. От ${service.price} BYN. ${service.description.slice(0, 140)}`
      : '',
    image: service?.photoUrl,
  })

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const meta = useMemo(
    () => (service ? resolveCategoryMeta(service.categoryId, byId) : null),
    [service, byId],
  )

  async function showAllReviews() {
    setReviews((r) => ({ ...r, loading: true }))
    try {
      // грузим всё одним запросом (до 50) — для MVP достаточно
      const data = await getServiceReviews(id, 1, 50)
      setReviews({ items: data.items, total: data.totalCount, page: 1, loading: false })
    } catch {
      setReviews((r) => ({ ...r, loading: false }))
    }
  }

  async function handleAdd() {
    if (adding) return
    if (needTime && !time) {
      show('Выберите время', 'error')
      return
    }
    setAdding(true)
    await addToCart(service.id, {
      quantity,
      desiredDate: date || null,
      desiredTime: time || null,
      comment: comment.trim() || null,
    })
    setAdding(false)
  }

  // «Заказать»: без корзины, сразу окно с адресом и телефоном
  function handleOrderNow() {
    if (!user) {
      navigate('/login')
      return
    }
    if (user.role !== 'Client') {
      show('Заказывать услуги могут только клиенты', 'error')
      return
    }
    if (needTime && !time) {
      show('Выберите время', 'error')
      return
    }
    setOrderOpen(true)
  }

  if (state.status === 'loading') {
    return (
      <div className="container sp-page">
        <div className="sp-skeleton" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="container sp-page">
        <div className="form-alert"><CircleAlert size={18} />{state.error}</div>
        <Link to="/" className="btn btn-outline btn-sm sp-back">В каталог</Link>
      </div>
    )
  }

  const src = !imageFailed && (service.photoUrl || meta.image)
  const Icon = meta.icon
  const hasRating = service.rating != null
  const unit = UNITS[service.unit] ?? ''
  const total = service.price * quantity
  const hiddenCount = reviews.total - reviews.items.length
  const place = [service.performerCity, service.performerServiceArea].filter(Boolean).join(', ')
  const hasPoint = service.performerLatitude != null && service.performerLongitude != null

  return (
    <div className="container sp-page">
      <nav className="sp-crumbs" aria-label="Навигация">
        <Link to="/">Каталог</Link>
        <ChevronRight size={14} />
        <Link to={`/?category=${service.categoryId}`}>{service.categoryName}</Link>
        <ChevronRight size={14} />
        <span>{service.title}</span>
      </nav>

      <div className="sp-layout">
        {/* ===== левая колонка ===== */}
        <div className="sp-left">
          <div className="sp-photo" style={{ '--cat': meta.color }}>
            {src ? (
              <img src={src} alt={service.title} onError={() => setImageFailed(true)} />
            ) : (
              <Icon size={72} strokeWidth={1.4} />
            )}
            <span className="sp-photo-count"><Camera size={15} /> 1 из 1</span>
          </div>

          <section className="sp-card sp-desc">
            <h2>Описание услуги</h2>
            <p>{service.description}</p>

            <div className="sp-perks">
              {PERKS.map(({ icon: PerkIcon, title, text }) => (
                <div className="sp-perk" key={title}>
                  <span className="sp-perk-icon"><PerkIcon size={20} strokeWidth={1.8} /></span>
                  <div>
                    <div className="sp-perk-title">{title}</div>
                    <div className="sp-perk-text">{text}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {(place || hasPoint) && (
            <section className="sp-card sp-where">
              <h2>Где работает мастер</h2>
              {place && <p className="sp-where-text"><MapPin size={17} /> {place}</p>}
              {hasPoint && (
                <MapView
                  height={240}
                  markers={[{
                    id: service.performerId,
                    lat: service.performerLatitude,
                    lng: service.performerLongitude,
                    title: service.performerName,
                    subtitle: place,
                  }]}
                />
              )}
              <p className="sp-where-note">Точка на карте показывает район, а не точный адрес мастера.</p>
            </section>
          )}
        </div>

        {/* ===== правая колонка ===== */}
        <div className="sp-right">
          <section className="sp-card sp-order">
            <div className="sp-top">
              <span className="sp-tag">{service.categoryName}</span>
              <div className="sp-top-actions">
                <ShareButton path={`/share/services/${service.id}`} title={service.title} />
                <FavoriteButton
                  variant="pill"
                  active={serviceIds.has(service.id)}
                  label={service.title}
                  onToggle={() => toggleService(service.id)}
                />
              </div>
            </div>
            <h1>{service.title}</h1>

            <div className="sp-rating">
              <Star size={16} fill="#f59e0b" stroke="#f59e0b" />
              {hasRating ? (
                <>
                  <b>{Number(service.rating).toFixed(1)}</b>
                  <span>({service.reviewCount} отзывов)</span>
                </>
              ) : (
                <span>Пока нет отзывов</span>
              )}
            </div>

            <div className="sp-master">
              <Link to={`/performers/${service.performerId}`} className="avatar sp-avatar" aria-label="Профиль мастера">
                {service.performerAvatarUrl
                  ? <img src={service.performerAvatarUrl} alt="" />
                  : initials(service.performerName)}
              </Link>
              <div className="sp-master-info">
                <Link to={`/performers/${service.performerId}`} className="sp-master-name">
                  {service.performerName}
                </Link>
                <div className="sp-master-role">{service.performerSpecialization || 'Частный мастер'}</div>
                <Link to={`/performers/${service.performerId}`} className="sp-master-link">
                  Профиль и все услуги <ChevronRight size={13} />
                </Link>
              </div>
              <div className="sp-master-side">
                {service.performerIsVerified ? (
                  <span className="sp-verified"><BadgeCheck size={18} /> Проверенный специалист</span>
                ) : (
                  <span className="sp-verified off"><ShieldOff size={18} /> Не проверен</span>
                )}
                {service.performerRating != null && (
                  <span className="sp-master-rate">
                    <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
                    <b>{Number(service.performerRating).toFixed(1)}</b>
                    <i>({service.performerReviewCount})</i>
                  </span>
                )}
              </div>
            </div>

            <div className="sp-form-row">
              <div className="sp-field">
                <span className="sp-label">Количество</span>
                <div className="stepper sp-stepper">
                  <button
                    type="button"
                    aria-label="Меньше"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus size={15} />
                  </button>
                  <span className="sp-qty">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Больше"
                    onClick={() => setQuantity((q) => Math.min(MAX_QTY, q + 1))}
                    disabled={quantity >= MAX_QTY}
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <label className="sp-field">
                <span className="sp-label">Желаемая дата</span>
                <input
                  type="date"
                  className="sp-date"
                  value={date}
                  min={minDate}
                  onChange={(e) => { setDate(e.target.value); setTime('') }}
                />
              </label>
            </div>

            <SlotPicker
              performerId={service.performerId}
              date={date}
              value={time}
              onChange={setTime}
              onLoaded={setNeedTime}
            />

            <label className="sp-field">
              <span className="sp-label">Комментарий (необязательно)</span>
              <textarea
                className="sp-comment"
                rows={2}
                maxLength={1000}
                placeholder="Комментарий (необязательно)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>

            <div className="sp-total">
              <span>{service.price} BYN{unit && ` / ${unit}`} × {quantity}</span>
              <b>{total} BYN</b>
            </div>

            <Button block onClick={handleOrderNow}>
              <Zap size={18} />
              Заказать
            </Button>
            <Button block variant="outline" loading={adding} onClick={handleAdd}>
              <ShoppingCart size={18} />
              Добавить в корзину
            </Button>
          </section>

          <section className="sp-card sp-reviews">
            <div className="sp-reviews-head">
              <h2>Отзывы клиентов</h2>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  className="link-btn"
                  onClick={showAllReviews}
                  disabled={reviews.loading}
                >
                  Смотреть все ({reviews.total})
                </button>
              )}
            </div>

            {reviews.items.length === 0 ? (
              <p className="sp-empty">Отзывов пока нет. Станьте первым, кто закажет эту услугу!</p>
            ) : (
              <ul className="sp-review-list">
                {reviews.items.map((r) => (
                  <li key={r.id} className="sp-review">
                    <span className="avatar sp-avatar">{initials(r.clientName)}</span>
                    <div className="sp-review-body">
                      <div className="sp-review-name">{r.clientName}</div>
                      <div className="sp-review-date">{formatDate(r.createdAt)}</div>
                      <div className="sp-review-stars">
                        <Stars value={r.rating} />
                        <b>{r.rating}.0</b>
                      </div>
                      <p>{r.text}</p>
                      <ReviewPhotos photos={r.photoUrls} />
                      <ReviewReply review={r} performerName={service.performerName} />
                      <ComplaintButton kind="Review" targetId={r.id} ownerId={r.clientId} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {orderOpen && (
        <QuickOrderModal
          service={service}
          quantity={quantity}
          date={date}
          time={time}
          comment={comment.trim()}
          photo={service.photoUrl || meta.image}
          color={meta.color}
          onClose={() => setOrderOpen(false)}
        />
      )}
    </div>
  )
}
