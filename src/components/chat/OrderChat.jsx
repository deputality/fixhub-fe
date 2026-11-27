import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, CheckCheck, MapPin, Phone, Send } from 'lucide-react'
import { getOrderMessages, sendOrderMessage } from '../../api/messages'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { invokeChat } from '../../realtime/chatConnection'
import { useChatConnection, useChatEvent, useChatState } from '../../realtime/useChat'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Modal from '../common/Modal'
import './OrderChat.css'

// Пока WebSocket недоступен, чат по-старому обновляется раз в 5 секунд
const FALLBACK_POLL_MS = 5000
const TYPING_SHOW_MS = 3500
const TYPING_SEND_MS = 2000

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
  const [typing, setTyping] = useState(false)
  const listRef = useRef(null)
  const stick = useRef(true)
  const typingTimer = useRef(0)
  const lastTypingSent = useRef(0)

  const closed = order.status === 'Cancelled'

  useChatConnection()
  const chatState = useChatState()
  const live = chatState === 'Connected'

  const load = useCallback(() => {
    getOrderMessages(order.id)
      .then((items) => setState({ status: 'ready', items, error: '' }))
      .catch((err) => {
        if (guard(err)) return
        setState((s) => (s.status === 'ready' ? s : { status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить переписку' }))
      })
  }, [order.id, guard])

  // Эффектам ниже нужна всегда актуальная load, но перезапускаться при её смене они не должны:
  // иначе каждая перерисовка заново входила бы в комнату заказа
  const loadRef = useRef(load)
  useEffect(() => {
    loadRef.current = load
  })

  // История подгружается сразу, не дожидаясь WebSocket
  useEffect(() => {
    loadRef.current()
  }, [order.id])

  // Когда соединение готово (и после каждого переподключения): входим в комнату заказа и заново
  // загружаем историю, чтобы не потерять сообщения, пришедшие, пока связи не было
  useEffect(() => {
    if (!live) return undefined
    let cancelled = false
    invokeChat('JoinOrder', order.id)
      .catch(() => {})
      .finally(() => { if (!cancelled) loadRef.current() })
    return () => {
      cancelled = true
      invokeChat('LeaveOrder', order.id).catch(() => {})
    }
  }, [live, order.id])

  // Запасной вариант: без WebSocket спрашиваем сервер раз в 5 секунд, как раньше
  useEffect(() => {
    if (live) return undefined
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') loadRef.current()
    }, FALLBACK_POLL_MS)
    return () => clearInterval(t)
  }, [live])

  // Сообщение открытого чата считается прочитанным, только если вкладка на экране
  const markRead = useCallback(() => {
    if (document.visibilityState === 'visible') invokeChat('MarkRead', order.id).catch(() => {})
  }, [order.id])

  useEffect(() => {
    document.addEventListener('visibilitychange', markRead)
    return () => document.removeEventListener('visibilitychange', markRead)
  }, [markRead])

  const append = useCallback((message) => {
    setState((s) => (s.items.some((m) => m.id === message.id)
      ? s
      : { ...s, status: 'ready', items: [...s.items, message] }))
  }, [])

  useChatEvent('MessageReceived', (message) => {
    if (message.orderId !== order.id) return
    append(message)
    if (message.senderId !== user.id) {
      setTyping(false)
      markRead()
    }
  })

  // собеседник прочитал: мои сообщения получают вторую галочку
  useChatEvent('MessagesRead', ({ orderId, readerId }) => {
    if (orderId !== order.id || readerId === user.id) return
    setState((s) => ({ ...s, items: s.items.map((m) => (m.senderId === user.id ? { ...m, isRead: true } : m)) }))
  })

  useChatEvent('UserTyping', ({ orderId, userId }) => {
    if (orderId !== order.id || userId === user.id) return
    setTyping(true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => setTyping(false), TYPING_SHOW_MS)
  })

  useEffect(() => () => clearTimeout(typingTimer.current), [])

  // новое сообщение: прокручиваем вниз, если человек и так был внизу
  useEffect(() => {
    const el = listRef.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [state.items.length, state.status, typing])

  function onScroll(e) {
    const el = e.currentTarget
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // Отправка: по WebSocket, а если соединения нет, обычным запросом
  async function deliver(value) {
    if (live) {
      try {
        const result = await invokeChat('SendMessage', order.id, value)
        if (!result.ok) throw { error: result.error, status: result.status }
        return result.message
      } catch (err) {
        // ошибка сервера (например, «заказ отменён»): показываем её; обрыв связи: пробуем обычным запросом
        if (err?.error) throw err
      }
    }
    return sendOrderMessage(order.id, value)
  }

  async function submit(e) {
    e?.preventDefault()
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    try {
      const message = await deliver(value)
      stick.current = true
      setText('')
      append(message)
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось отправить сообщение', 'error')
    } finally {
      setSending(false)
    }
  }

  function onChange(e) {
    setText(e.target.value)
    // «печатает...» отправляем не чаще раза в пару секунд
    const now = Date.now()
    if (live && e.target.value && now - lastTypingSent.current > TYPING_SEND_MS) {
      lastTypingSent.current = now
      invokeChat('Typing', order.id).catch(() => {})
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

          {typing && (
            <div className="chat-typing" aria-live="polite">
              <span className="chat-dots" aria-hidden="true"><i /><i /><i /></span>
              {peerName ? `${peerName} печатает` : 'Собеседник печатает'}
            </div>
          )}
        </div>

        {(chatState === 'Reconnecting' || chatState === 'Disconnected') && state.status === 'ready' && (
          <div className="chat-offline" role="status">Нет соединения. Сообщения могут приходить с задержкой.</div>
        )}

        {closed ? (
          <div className="chat-closed">Заказ отменён, писать в чат больше нельзя</div>
        ) : (
          <form className="chat-form" onSubmit={submit}>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Напишите сообщение..."
              value={text}
              onChange={onChange}
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
