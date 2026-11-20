import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import {
  getNotifications, getUnreadCount, markAllNotificationsRead, markNotificationRead,
} from '../api/notifications'

const POLL_MS = 60000

function formatWhen(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function NotificationsBell() {
  const navigate = useNavigate()
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(null)
  const ref = useRef(null)

  const refreshCount = useCallback(() => {
    getUnreadCount().then((d) => setCount(d.count)).catch(() => {})
  }, [])

  // счётчик обновляем раз в минуту
  useEffect(() => {
    refreshCount()
    const t = setInterval(refreshCount, POLL_MS)
    return () => clearInterval(t)
  }, [refreshCount])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (open) return setOpen(false)
    setOpen(true)
    setItems(null)
    getNotifications()
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
  }

  async function openItem(n) {
    setOpen(false)
    if (!n.isRead) {
      markNotificationRead(n.id).catch(() => {})
      setCount((c) => Math.max(0, c - 1))
    }
    if (n.orderId) navigate('/performer/orders')
    else if (n.reviewId) navigate('/performer/reviews')
  }

  async function readAll() {
    try {
      await markAllNotificationsRead()
      setCount(0)
      setItems((list) => list?.map((n) => ({ ...n, isRead: true })))
    } catch { /* не критично */ }
  }

  return (
    <div className="bell" ref={ref}>
      <button type="button" className="bell-btn" aria-label="Уведомления" aria-expanded={open} onClick={toggle}>
        <Bell size={28} strokeWidth={1.6} />
        {count > 0 && <span key={count} className="bell-badge">{count > 9 ? '9+' : count}</span>}
      </button>

      {open && (
        <div className="bell-list">
          <div className="bell-head">
            <b>Уведомления</b>
            {count > 0 && <button type="button" onClick={readAll}>Прочитать все</button>}
          </div>
          {items === null && <div className="bell-empty">Загрузка...</div>}
          {items?.length === 0 && <div className="bell-empty">Пока нет уведомлений</div>}
          {items?.map((n) => (
            <button key={n.id} type="button" className={`bell-item${n.isRead ? '' : ' unread'}`} onClick={() => openItem(n)}>
              <span>{n.text}</span>
              <small>{formatWhen(n.createdAt)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
