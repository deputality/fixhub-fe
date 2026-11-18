import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleAlert, ClipboardList, Star } from 'lucide-react'
import { cancelOrder, createReview, getMyOrders, getMyReviews } from '../api/orders'
import { getCategories, getService } from '../api/catalog'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import Button from '../components/Button'
import Modal from '../components/Modal'
import Pagination from '../components/Pagination'
import './OrdersPage.css'

const PAGE_SIZE = 6

const STATUSES = {
  New: { label: 'Новый', cls: 'st-new' },
  Confirmed: { label: 'Подтверждён', cls: 'st-confirmed' },
  InProgress: { label: 'В работе', cls: 'st-progress' },
  Completed: { label: 'Выполнен', cls: 'st-done' },
  Cancelled: { label: 'Отменён', cls: 'st-cancelled' },
}

const FILTERS = [
  { value: 'all', label: 'Все заказы' },
  { value: 'New', label: 'Новый' },
  { value: 'Confirmed', label: 'Подтверждён' },
  { value: 'InProgress', label: 'В работе' },
  { value: 'Completed', label: 'Выполнен' },
  { value: 'Cancelled', label: 'Отменён' },
]

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function StarsInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="stars-input" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} из 5`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={30} fill={n <= shown ? '#f59e0b' : 'none'} stroke={n <= shown ? '#f59e0b' : '#cbd5e1'} />
        </button>
      ))}
    </div>
  )
}

function ReviewModal({ order, reviewedIds, onClose, onDone }) {
  const free = order.items.filter((i) => !reviewedIds.has(i.id))
  const [itemId, setItemId] = useState(free[0]?.id)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!rating) return setError('Поставьте оценку')
    if (!text.trim()) return setError('Напишите пару слов об услуге')

    setBusy(true)
    setError('')
    try {
      await createReview({ orderItemId: itemId, rating, text: text.trim() })
      onDone(itemId)
    } catch (err) {
      setError(err?.error ?? 'Не удалось отправить отзыв')
      setBusy(false)
    }
  }

  return (
    <Modal title="Оставить отзыв" onClose={onClose}>
      <form onSubmit={submit} className="review-form">
        {free.length > 1 && (
          <label className="sp-field">
            <span className="sp-label">Услуга</span>
            <select className="sp-date" value={itemId} onChange={(e) => setItemId(Number(e.target.value))}>
              {free.map((i) => <option key={i.id} value={i.id}>{i.serviceTitle}</option>)}
            </select>
          </label>
        )}
        {free.length === 1 && <div className="review-service">{free[0].serviceTitle}</div>}

        <StarsInput value={rating} onChange={(n) => { setRating(n); setError('') }} />

        <textarea
          className="sp-comment"
          rows={4}
          maxLength={2000}
          placeholder="Как всё прошло?"
          value={text}
          onChange={(e) => { setText(e.target.value); setError('') }}
        />

        {error && (
          <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>
        )}

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={busy}>Отправить</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function OrdersPage() {
  const { logout } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading', orders: [], error: '' })
  const [reviewedIds, setReviewedIds] = useState(() => new Set())
  const [services, setServices] = useState({})
  const [categories, setCategories] = useState([])

  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null)

  const live = useRef({})
  useEffect(() => { live.current = { logout, navigate, show } })

  function handleAuthError(err) {
    if (err?.status !== 401) return false
    live.current.logout()
    live.current.show('Сессия истекла, войдите снова', 'error')
    live.current.navigate('/login')
    return true
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyOrders(), getMyReviews().catch(() => []), getCategories().catch(() => [])])
      .then(([orders, reviews, cats]) => {
        if (cancelled) return
        setCategories(cats)
        setReviewedIds(new Set(reviews.map((r) => r.orderItemId)))
        setState({ status: 'ready', orders, error: '' })

        // фото и рейтинг мастера берём из карточки услуги (первая позиция заказа)
        const ids = [...new Set(orders.map((o) => o.items[0]?.serviceId).filter(Boolean))]
        Promise.allSettled(ids.map((id) => getService(id))).then((results) => {
          if (cancelled) return
          const map = {}
          results.forEach((r) => { if (r.status === 'fulfilled') map[r.value.id] = r.value })
          setServices(map)
        })
      })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return
        setState({ status: 'error', orders: [], error: err?.error ?? 'Не удалось загрузить заказы' })
      })
    return () => { cancelled = true }
  }, [])

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(
    () => (filter === 'all' ? state.orders : state.orders.filter((o) => o.status === filter)),
    [state.orders, filter],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  async function confirmCancel() {
    setCancelBusy(true)
    try {
      await cancelOrder(cancelTarget.id)
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'Cancelled' } : o)),
      }))
      show('Заказ отменён')
      setCancelTarget(null)
    } catch (err) {
      if (handleAuthError(err)) return
      show(err?.error ?? 'Не удалось отменить заказ', 'error')
    } finally {
      setCancelBusy(false)
    }
  }

  function onReviewed(itemId) {
    setReviewedIds((prev) => new Set(prev).add(itemId))
    setReviewTarget(null)
    show('Спасибо за отзыв!')
  }

  function renderActions(order) {
    const hasFreeItem = order.items.some((i) => !reviewedIds.has(i.id))
    const active = ['New', 'Confirmed', 'InProgress'].includes(order.status)

    return (
      <>
        {order.status === 'New' && (
          <button type="button" className="ord-btn ord-btn-cancel" onClick={() => setCancelTarget(order)}>
            Отменить
          </button>
        )}
        {order.status === 'Completed' && hasFreeItem && (
          <button type="button" className="ord-btn ord-btn-review" onClick={() => setReviewTarget(order)}>
            Оставить отзыв
          </button>
        )}
        {order.status === 'Completed' && !hasFreeItem && (
          <button type="button" className="ord-btn ord-btn-off" disabled>Отзыв оставлен</button>
        )}
        {active && (
          <button type="button" className="ord-btn ord-btn-off" disabled title="Отзыв можно оставить после выполнения заказа">
            Оставить отзыв
          </button>
        )}
      </>
    )
  }

  function renderRow(order, index) {
    const first = order.items[0]
    const service = services[first?.serviceId]
    const meta = resolveCategoryMeta(service?.categoryId, byId)
    const Icon = meta.icon
    const photo = service?.photoUrl || meta.image
    const more = order.items.length - 1
    const st = STATUSES[order.status] ?? { label: order.status, cls: '' }

    return (
      <li key={order.id} className="ord-row" style={{ animationDelay: `${index * 50}ms` }}>
        <div className="ord-service">
          <Link to={first ? `/services/${first.serviceId}` : '#'} className="ord-photo" style={{ '--cat': meta.color }}>
            {photo ? <img src={photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <Icon size={26} />}
          </Link>
          <div className="ord-service-info">
            <div className="ord-title">{first?.serviceTitle ?? 'Услуга'}</div>
            {first?.comment && <div className="ord-sub">{first.comment}</div>}
            {more > 0 && <div className="ord-sub">и ещё {more}</div>}
            <div className="ord-num">№ {order.id}</div>
          </div>
        </div>

        <div className="ord-master">
          <span className="avatar">{initials(order.performerName)}</span>
          <div>
            <div className="ord-master-name">{order.performerName}</div>
            {service?.performerRating != null && (
              <div className="ord-master-rate">
                <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
                <b>{Number(service.performerRating).toFixed(1)}</b>
                <i>({service.performerReviewCount})</i>
              </div>
            )}
          </div>
        </div>

        <div className="ord-date">
          <div>{formatDate(order.createdAt)}</div>
          <div className="ord-time">{formatTime(order.createdAt)}</div>
        </div>

        <div><span className={`ord-status ${st.cls}`}>{st.label}</span></div>
        <div className="ord-sum">{order.totalAmount} BYN</div>
        <div className="ord-actions">{renderActions(order)}</div>
      </li>
    )
  }

  let body
  if (state.status === 'loading') {
    body = (
      <ul className="ord-list" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="ord-row"><div className="skeleton sk-line" style={{ gridColumn: '1 / -1', height: 56 }} /></li>
        ))}
      </ul>
    )
  } else if (state.status === 'error') {
    body = <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>
  } else if (filtered.length === 0) {
    body = (
      <div className="empty">
        <ClipboardList size={46} strokeWidth={1.5} />
        <h3>{state.orders.length === 0 ? 'Заказов пока нет' : 'Нет заказов с таким статусом'}</h3>
        {state.orders.length === 0 && (
          <>
            <p>Выберите услугу в каталоге и оформите первый заказ</p>
            <Link to="/" className="btn btn-primary btn-sm">Перейти в каталог</Link>
          </>
        )}
      </div>
    )
  } else {
    body = (
      <>
        <div className="ord-head">
          <span>Услуга</span><span>Исполнитель</span><span>Дата заказа</span>
          <span>Статус</span><span>Сумма</span><span>Действия</span>
        </div>
        <ul className="ord-list">{visible.map(renderRow)}</ul>
      </>
    )
  }

  return (
    <div className="ord-page">
      <h1>Мои заказы</h1>
      <p className="ord-lead">
        Здесь вы можете отслеживать статус ваших заказов, управлять ими и оставлять отзывы о выполненных работах.
      </p>

      <div className="ord-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`ord-chip${filter === f.value ? ' active' : ''}`}
            onClick={() => { setFilter(f.value); setPage(1) }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="ord-panel">
        {body}
        {state.status === 'ready' && filtered.length > 0 && (
          <div className="ord-foot">
            <span className="ord-total">Всего заказов: {filtered.length}</span>
            <Pagination page={current} totalPages={totalPages} onChange={setPage} />
          </div>
        )}
      </section>

      {cancelTarget && (
        <Modal title="Отменить заказ?" onClose={() => !cancelBusy && setCancelTarget(null)}>
          <p className="modal-text">
            Заказ № {cancelTarget.id} ({cancelTarget.items[0]?.serviceTitle}) будет отменён. Это действие нельзя отменить.
          </p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelBusy}>Не отменять</Button>
            <Button variant="danger" onClick={confirmCancel} loading={cancelBusy}>Отменить заказ</Button>
          </div>
        </Modal>
      )}

      {reviewTarget && (
        <ReviewModal
          order={reviewTarget}
          reviewedIds={reviewedIds}
          onClose={() => setReviewTarget(null)}
          onDone={onReviewed}
        />
      )}
    </div>
  )
}