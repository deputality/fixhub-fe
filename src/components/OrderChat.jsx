import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, MapPin, Phone, Send } from 'lucide-react'
import { getOrderMessages, sendOrderMessage } from '../api/messages'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import Modal from './Modal'
import './OrderChat.css'

const POLL_MS = 5000

function dayKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (dayKey(iso) === dayKey(today.toISOString())) return 'Сегодня'
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Вчера'
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function time(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// order: заказ; peerName/peerPhone: собеседник; peerHint: что показать, если телефона пока нет
export default function OrderChat({ order, title, peerName, peerPhone, peerHint, onClose }) {
  const { user } = useAuth()
  const { show } = useToast()
  const guard = useAuthGuard()

  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)
  const stick = useRef(true)

  const closed = order.status === 'Cancelled'

  const load = useCallback(() => {
    getOrderMessages(order.id)
      .then((items) => setState({ status: 'ready', items, error: '' }))
      .catch((err) => {
        if (guard(err)) return
        setState((s) => (s.status === 'ready' ? s : { status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить переписку' }))
      })
  }, [order.id, guard])

  // подгружаем сразу и потом раз в 5 секунд, пока чат открыт
  useEffect(() => {
    load()
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [load])

  // новое сообщение: прокручиваем вниз, если человек и так был внизу
  useEffect(() => {
    const el = listRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [state.items.length, state.status])

  function onScroll(e) {
    const el = e.currentTarget
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function submit(e) {
    e?.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const message = await sendOrderMessage(order.id, value)
      stick.current = true
      setText('')
      setState((s) => ({ ...s, status: 'ready', items: [...s.items, message] }))
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось отправить сообщение', 'error')
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const items = state.items

  return (
    <Modal title={`Чат по заказу № ${order.id}`} onClose={onClose}>
      <div className="chat">
        <div className="chat-info">
          <div className="chat-info-title">{title}</div>
          <div className="chat-info-row">
            <b>{peerName}</b>
            {peerPhone ? (
              <a href={`tel:${peerPhone.replace(/[^\d+]/g, '')}`}><Phone size={13} /> {peerPhone}</a>
            ) : (
              peerHint && <span className="chat-hint">{peerHint}</span>
            )}
          </div>
          {order.address && (
            <div className="chat-info-row chat-address"><MapPin size={13} /> {order.address}</div>
          )}
        </div>

        <div className="chat-list" ref={listRef} onScroll={onScroll} aria-live="polite">
          {state.status === 'loading' && <div className="chat-empty">Загрузка...</div>}
          {state.status === 'error' && <div className="chat-empty chat-error">{state.error}</div>}
          {state.status === 'ready' && items.length === 0 && (
            <div className="chat-empty">
              Сообщений пока нет. Напишите первым: уточните время, адрес или детали заказа.
            </div>
          )}

          {items.map((m, i) => {
            const mine = m.senderId === user.id
            const newDay = i === 0 || dayKey(items[i - 1].createdAt) !== dayKey(m.createdAt)
            return (
              <div key={m.id}>
                {newDay && <div className="chat-day">{dayLabel(m.createdAt)}</div>}
                <div className={`chat-msg ${mine ? 'mine' : 'theirs'}`}>
                  <div className="chat-bubble">
                    <p>{m.text}</p>
                    <span className="chat-meta">
                      {time(m.createdAt)}
                      {mine && (m.isRead ? <CheckCheck size={14} aria-label="Прочитано" /> : <Check size={14} aria-label="Отправлено" />)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {closed ? (
          <div className="chat-closed">Заказ отменён, писать в чат больше нельзя</div>
        ) : (
          <form className="chat-form" onSubmit={submit}>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Напишите сообщение..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Сообщение"
            />
            <button type="submit" className="chat-send" disabled={sending || !text.trim()} aria-label="Отправить">
              <Send size={20} />
            </button>
          </form>
        )}
        {!closed && <div className="chat-tip">Enter отправляет, Shift+Enter переносит строку</div>}
      </div>
    </Modal>
  )
}
