import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, ClipboardList, MapPin, Phone, Wrench } from 'lucide-react'
import {
  completeOrder, confirmOrder, getIncomingOrders, rejectOrder, startOrder,
} from '../../api/performer'
import { useToast } from '../../context/ToastContext'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Button from '../../components/Button'
import ChatButton from '../../components/ChatButton'
import Modal from '../../components/Modal'
import OrderChat from '../../components/OrderChat'
import Pagination from '../../components/Pagination'
import { useUnreadChats } from '../../utils/useUnreadChats'

const PAGE_SIZE = 5

const STATUSES = {
  New: { label: 'Новый', cls: 'pf-st-new' },
  Confirmed: { label: 'Подтверждён', cls: 'pf-st-confirmed' },
  InProgress: { label: 'В работе', cls: 'pf-st-progress' },
  Completed: { label: 'Выполнен', cls: 'pf-st-done' },
  Cancelled: { label: 'Отменён', cls: 'pf-st-cancelled' },
}

const FILTERS = [
  { value: 'New', label: 'Новые' },
  { value: 'Confirmed', label: 'Подтверждённые' },
  { value: 'InProgress', label: 'В работе' },
  { value: 'Completed', label: 'Выполненные' },
  { value: 'Cancelled', label: 'Отменённые' },
  { value: 'all', label: 'Все' },
]

const LEADS = {
  New: 'Новые заказы от клиентов, которые ждут вашего подтверждения.',
  Confirmed: 'Заказы, которые вы подтвердили и ещё не начали.',
  InProgress: 'Заказы, которые сейчас выполняются.',
  Completed: 'Выполненные заказы.',
  Cancelled: 'Отклонённые и отменённые заказы.',
  all: 'Все заказы от клиентов.',
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}
function formatDesired(iso) {
  const [y, m, d] = String(iso).split('-')
  return `${d}.${m}.${y}`
}

export default function OrdersPanel({ onChanged }) {
  const { show } = useToast()
  const guard = useAuthGuard()

  const [filter, setFilter] = useState('New')
  const [result, setResult] = useState({ key: null, orders: [], error: '' })
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [chatOrder, setChatOrder] = useState(null)
  const { unread, refresh: refreshUnread } = useUnreadChats()

  useEffect(() => {
    let cancelled = false
    getIncomingOrders(filter === 'all' ? '' : filter)
      .then((orders) => { if (!cancelled) setResult({ key: filter, orders, error: '' }) })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setResult({ key: filter, orders: [], error: err?.error ?? 'Не удалось загрузить заказы' })
      })
    return () => { cancelled = true }
  }, [filter, guard])

  const loading = result.key !== filter
  const orders = result.orders
  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE))
  const current = Math.min(page, totalPages)
  const visible = useMemo(
    () => orders.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    [orders, current],
  )

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
  }

  async function run(order, action, okMessage) {
    setBusyId(order.id)
    try {
      const updated = await action(order.id)
      setResult((r) => ({
        ...r,
        orders: filter === 'all' || updated.status === filter
          ? r.orders.map((o) => (o.id === order.id ? updated : o))
          : r.orders.filter((o) => o.id !== order.id),
      }))
      show(okMessage)
      onChanged?.()
      return true
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось изменить статус заказа', 'error')
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function confirmReject() {
    const ok = await run(rejectTarget, rejectOrder, 'Заказ отклонён')
    if (ok) setRejectTarget(null)
  }

  function renderActions(order) {
    const busy = busyId === order.id
    if (order.status === 'New') {
      return (
        <>
          <Button loading={busy} onClick={() => run(order, confirmOrder, 'Заказ подтверждён')}>Подтвердить</Button>
          <button type="button" className="pf-btn-reject" disabled={busy} onClick={() => setRejectTarget(order)}>Отклонить</button>
        </>
      )
    }
    if (order.status === 'Confirmed') {
      return <Button loading={busy} onClick={() => run(order, startOrder, 'Работа начата')}>Начать работу</Button>
    }
    if (order.status === 'InProgress') {
      return <Button loading={busy} onClick={() => run(order, completeOrder, 'Заказ выполнен')}>Завершить</Button>
    }
    return <span className={`pf-status ${STATUSES[order.status]?.cls}`}>{STATUSES[order.status]?.label}</span>
  }

  return (
    <section className="pf-panel">
      <h2>Входящие заказы</h2>
      <p className="pf-panel-lead">{LEADS[filter]}</p>

      <div className="pf-chips">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`pf-chip${filter === f.value ? ' active' : ''}`}
            onClick={() => changeFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && (
        <div aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton pf-sk-row" />)}
        </div>
      )}

      {!loading && result.error && (
        <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{result.error}</span></div>
      )}

      {!loading && !result.error && orders.length === 0 && (
        <div className="empty">
          <ClipboardList size={42} strokeWidth={1.5} />
          <h3>Заказов нет</h3>
          <p>Здесь появятся заказы, как только клиенты оформят их на ваши услуги</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <ul className="pf-orders">
          {visible.map((order) => {
            const first = order.items[0]
            const extra = order.items.length - 1
            const comment = order.items.find((i) => i.comment)?.comment
            const desired = order.items.find((i) => i.desiredDate)?.desiredDate
            return (
              <li key={order.id} className="pf-order">
                <div className="pf-order-main">
                  <span className="pf-order-icon"><Wrench size={24} strokeWidth={1.7} /></span>
                  <div className="pf-order-info">
                    <div className="pf-order-title">
                      {first?.serviceTitle}
                      {extra > 0 && <span className="pf-order-more"> +{extra}</span>}
                    </div>
                    {comment && <div className="pf-order-sub">Комментарий: {comment}</div>}
                    <div className="pf-order-sub pf-order-geo"><MapPin size={14} /> {order.address}</div>
                    <div className="pf-order-num">Заказ №{order.id}{desired && ` · на ${formatDesired(desired)}`}</div>
                  </div>
                </div>

                <div className="pf-order-client">
                  <span className="avatar">{order.clientName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <div>
                    <div className="pf-order-client-name">{order.contactName || order.clientName}</div>
                    <div className="pf-order-phone">
                      <Phone size={13} />{' '}
                      <a href={`tel:${order.contactPhone.replace(/[^\d+]/g, '')}`}>{order.contactPhone}</a>
                    </div>
                  </div>
                </div>

                <div className="pf-order-date">
                  {formatDate(order.createdAt)}
                  <small>{formatTime(order.createdAt)}</small>
                </div>

                <div className="pf-order-sum">{order.totalAmount} BYN</div>

                <div className="pf-order-actions">
                  {renderActions(order)}
                  <ChatButton count={unread[order.id]} onClick={() => setChatOrder(order)} />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && orders.length > 0 && (
        <div className="pf-foot">
          <span className="pf-total">Всего заказов: {orders.length}</span>
          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </div>
      )}

      {chatOrder && (
        <OrderChat
          order={chatOrder}
          title={chatOrder.items[0]?.serviceTitle}
          peerName={chatOrder.contactName || chatOrder.clientName}
          peerPhone={chatOrder.contactPhone}
          onClose={() => { setChatOrder(null); refreshUnread() }}
        />
      )}

      {rejectTarget && (
        <Modal title="Отклонить заказ?" onClose={() => busyId === null && setRejectTarget(null)}>
          <p className="modal-text">
            Заказ №{rejectTarget.id} от клиента {rejectTarget.clientName} будет отменён. Клиент получит уведомление.
          </p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setRejectTarget(null)} disabled={busyId !== null}>Назад</Button>
            <Button variant="danger" onClick={confirmReject} loading={busyId === rejectTarget.id}>Отклонить заказ</Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
