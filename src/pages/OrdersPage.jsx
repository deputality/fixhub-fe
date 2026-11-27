import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CircleAlert, ClipboardList, Phone, RotateCw, Star } from 'lucide-react'
import { cancelOrder, createReview, getMyOrders, getMyReviews, repeatOrder } from '../api/orders'
import { getCart } from '../api/cart'
import { getCategories, getService } from '../api/catalog'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import { useUnreadChats } from '../utils/useUnreadChats'
import { useLiveRefresh } from '../realtime/useChat'
import Button from '../components/Button'
import ChatButton from '../components/ChatButton'
import OrderChat from '../components/OrderChat'
import Modal from '../components/Modal'
import Select from '../components/Select'
import OrderHistory from '../components/OrderHistory'
import PhotoPicker from '../components/PhotoPicker'
import ReasonModal from '../components/ReasonModal'
import Pagination from '../components/Pagination'
import './OrdersPage.css'

const PAGE_SIZE = 6

const STATUSES = {
  New: { label: 'Новый', cls: 'ord-st-new' },
  Confirmed: { label: 'Подтверждён', cls: 'ord-st-confirmed' },
  InProgress: { label: 'В работе', cls: 'ord-st-progress' },
  Completed: { label: 'Выполнен', cls: 'ord-st-done' },
  Cancelled: { label: 'Отменён', cls: 'ord-st-cancelled' },
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

function formatDesired(iso, time) {
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}.${m}.${y}${time ? ` в ${String(time).slice(0, 5)}` : ''}`
}

const CANCEL_PRESETS = ['Передумал(а)', 'Нашёл(ла) другого мастера', 'Ошибся(лась) при заказе', 'Изменились планы']

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function StarsInput({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="ord-stars-input" onMouseLeave={() => setHover(0)}>
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
  const [photos, setPhotos] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!rating) return setError('Поставьте оценку')
    if (!text.trim()) return setError('Напишите пару слов об услуге')

    setBusy(true)
    setError('')
    try {
      await createReview({ orderItemId: itemId, rating, text: text.trim(), photoUrls: photos })
      onDone(itemId)
    } catch (err) {
      setError(err?.error ?? 'Не удалось отправить отзыв')
      setBusy(false)
    }
  }

  return (
    <Modal title="Оставить отзыв" onClose={onClose}>
      <form onSubmit={submit} className="ord-review-form">
        {free.length > 1 && (
          <div className="sp-field">
            <span className="sp-label">Услуга</span>
            <Select value={itemId} onChange={(v) => setItemId(Number(v))} ariaLabel="Услуга"
              options={free.map((i) => ({ value: i.id, label: i.serviceTitle }))} />
          </div>
        )}
        {free.length === 1 && <div className="ord-review-service">{free[0].serviceTitle}</div>}

        <StarsInput value={rating} onChange={(n) => { setRating(n); setError('') }} />

        <textarea
          className="sp-comment"
          rows={4}
          maxLength={2000}
          placeholder="Как всё прошло?"
          value={text}
          onChange={(e) => { setText(e.target.value); setError('') }}
        />

        <PhotoPicker label="Фото (необязательно)" max={3} value={photos} onChange={setPhotos}
          hint="До 3 фото, JPG или PNG, до 5 МБ" />

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
  const { setCount } = useCart()
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading', orders: [], error: '' })
  const [reviewedIds, setReviewedIds] = useState(() => new Set())
  const [services, setServices] = useState({})
  const [categories, setCategories] = useState([])

  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [repeatBusy, setRepeatBusy] = useState(null)
  const [reviewTarget, setReviewTarget] = useState(null)
  const [chatOrder, setChatOrder] = useState(null)
  const { unread, refresh: refreshUnread } = useUnreadChats()

  const live = useRef({})
  useEffect(() => { live.current = { logout, navigate, show } })

  // свежие данные для тихого обновления: что уже показано и какие услуги уже подгружены
  const shown = useRef({ orders: [], services: {} })
  // после собственной отмены не показываем второе уведомление о том же заказе
  const quietUntil = useRef(0)
  useEffect(() => { shown.current = { orders: state.orders, services: services } })

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

  // Заказ принят, выполнен или отменён мастером: страница обновляется сама, без перезагрузки.
  // Показываем уведомление и подгружаем фото новых мастеров
  const refreshOrders = useCallback(() => {
    Promise.all([getMyOrders(), getMyReviews().catch(() => null)])
      .then(([orders, reviews]) => {
        const before = new Map(shown.current.orders.map((o) => [o.id, o.status]))
        if (before.size > 0 && Date.now() > quietUntil.current) {
          orders.forEach((o) => {
            const was = before.get(o.id)
            if (was && was !== o.status) {
              live.current.show(`Заказ №${o.id}: ${(STATUSES[o.status]?.label ?? o.status).toLowerCase()}`)
            }
          })
        }

        setState({ status: 'ready', orders, error: '' })
        if (reviews) setReviewedIds(new Set(reviews.map((r) => r.orderItemId)))

        const missing = [...new Set(orders.map((o) => o.items[0]?.serviceId).filter(Boolean))]
          .filter((id) => !shown.current.services[id])
        if (missing.length === 0) return
        Promise.allSettled(missing.map((id) => getService(id))).then((results) => {
          const map = {}
          results.forEach((r) => { if (r.status === 'fulfilled') map[r.value.id] = r.value })
          setServices((s) => ({ ...s, ...map }))
        })
      })
      .catch(() => { /* тихое обновление: при сбое остаётся прежний список */ })
  }, [])

  useLiveRefresh(refreshOrders)

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])

  const filtered = useMemo(
    () => (filter === 'all' ? state.orders : state.orders.filter((o) => o.status === filter)),
    [state.orders, filter],
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  async function confirmCancel(reason) {
    try {
      quietUntil.current = Date.now() + 4000
      await cancelOrder(cancelTarget.id, reason)
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === cancelTarget.id ? { ...o, status: 'Cancelled', cancelReason: reason } : o)),
      }))
      show('Заказ отменён')
      setCancelTarget(null)
    } catch (err) {
      if (handleAuthError(err)) return
      const msg = err?.errors ? Object.values(err.errors).flat()[0] : err?.error
      show(msg ?? 'Не удалось отменить заказ', 'error')
    }
  }

  async function repeat(order) {
    setRepeatBusy(order.id)
    try {
      const res = await repeatOrder(order.id)
      getCart().then((c) => setCount(c.items.length)).catch(() => {})
      if (res.skipped?.length) show(`В корзину добавлено: ${res.added}. Недоступно: ${res.skipped.join(', ')}`)
      else show('Услуги из заказа добавлены в корзину')
      if (res.added > 0) navigate('/cart')
    } catch (err) {
      if (handleAuthError(err)) return
      show(err?.error ?? 'Не удалось повторить заказ', 'error')
    } finally {
      setRepeatBusy(null)
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
        <ChatButton count={unread[order.id]} onClick={() => setChatOrder(order)} />
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
        {(order.status === 'Completed' || order.status === 'Cancelled') && (
          <button type="button" className="ord-btn ord-btn-review" disabled={repeatBusy === order.id} onClick={() => repeat(order)}>
            <RotateCw size={13} /> Заказать снова
          </button>
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
            {order.items.find((i) => i.desiredDate) && (
              <div className="ord-sub">
                На {formatDesired(order.items.find((i) => i.desiredDate).desiredDate, order.items.find((i) => i.desiredDate).desiredTime)}
              </div>
            )}
            {order.status === 'Cancelled' && order.cancelReason && (
              <div className="cancel-reason"><b>Причина отмены:</b> {order.cancelReason}</div>
            )}
            <OrderHistory orderId={order.id} />
          </div>
        </div>

        <div className="ord-master">
          <span className="avatar">{initials(order.performerName)}</span>
          <div>
            <div className="ord-master-name">{order.performerName}</div>
            {order.performerPhone && (
              <a className="ord-master-phone" href={`tel:${order.performerPhone.replace(/[^\d+]/g, '')}`}>
                <Phone size={13} /> {order.performerPhone}
              </a>
            )}
            {!order.performerPhone && order.status === 'New' && (
              <div className="ord-master-hint">Телефон мастера появится после подтверждения заказа</div>
            )}
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
        <ReasonModal
          title="Отменить заказ?"
          text={`Заказ № ${cancelTarget.id} (${cancelTarget.items[0]?.serviceTitle}) будет отменён. Это действие нельзя отменить.`}
          presets={CANCEL_PRESETS}
          confirmLabel="Отменить заказ"
          onConfirm={confirmCancel}
          onClose={() => setCancelTarget(null)}
        />
      )}

      {chatOrder && (
        <OrderChat
          order={chatOrder}
          title={chatOrder.items[0]?.serviceTitle}
          peerName={chatOrder.performerName}
          peerPhone={chatOrder.performerPhone}
          peerHint="Телефон мастера станет виден после подтверждения заказа"
          onClose={() => { setChatOrder(null); refreshUnread() }}
        />
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