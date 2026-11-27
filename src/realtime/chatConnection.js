import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'

// Одно WebSocket-соединение на всё приложение (SignalR). Через него приходят новые сообщения чата,
// «прочитано», «печатает» и значки непрочитанного. Если WebSocket недоступен, SignalR сам
// переключается на запасной способ, а при обрыве связи переподключается.
//
// Соединение открывается, пока кто-то им пользуется (acquireChat), и закрывается, когда
// пользоваться перестали: например, после выхода из аккаунта.

const HUB_URL = '/hubs/chat'
const EVENTS = ['MessageReceived', 'MessagesRead', 'UserTyping', 'UnreadChanged', 'NotificationsChanged', 'OrdersChanged']
const STOP_DELAY_MS = 1500
const RETRY_MS = 5000
const RETRY_DELAYS = [0, 1000, 2000, 4000, 8000, 15000]

let connection = null
let users = 0
let stopTimer = null
let retryTimer = null
let starting = false

const stateListeners = new Set()
const handlers = new Map(EVENTS.map((name) => [name, new Set()]))

// 'Connected' | 'Connecting' | 'Reconnecting' | 'Disconnected'
export function getChatState() {
  return connection?.state ?? HubConnectionState.Disconnected
}

function emitState() {
  const state = getChatState()
  stateListeners.forEach((fn) => fn(state))
}

export function onChatState(fn) {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

// Подписка на событие от сервера. Работает и после пересоздания соединения
export function onChatEvent(name, fn) {
  handlers.get(name)?.add(fn)
  return () => handlers.get(name)?.delete(fn)
}

const hasToken = () => Boolean(localStorage.getItem('token'))

function build() {
  const c = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      // токен берём при каждом подключении: после обновления он может измениться
      accessTokenFactory: () => localStorage.getItem('token') ?? '',
      withCredentials: false,
    })
    .withAutomaticReconnect({
      // пытаемся переподключаться, пока человек вошёл в аккаунт; задержки растут до 15 секунд
      nextRetryDelayInMilliseconds: (ctx) => (hasToken() ? RETRY_DELAYS[Math.min(ctx.previousRetryCount, RETRY_DELAYS.length - 1)] : null),
    })
    .configureLogging(LogLevel.Warning)
    .build()

  EVENTS.forEach((name) => c.on(name, (...args) => handlers.get(name).forEach((fn) => fn(...args))))

  c.onreconnecting(emitState)
  c.onreconnected(emitState)
  c.onclose(() => {
    emitState()
    // автоматические попытки закончились (например, сервер был выключен): пробуем снова позже
    if (users > 0 && hasToken()) scheduleRetry()
  })
  return c
}

function scheduleRetry() {
  clearTimeout(retryTimer)
  retryTimer = setTimeout(start, RETRY_MS)
}

function start() {
  if (!hasToken() || users <= 0) return
  if (!connection) connection = build()
  if (connection.state !== HubConnectionState.Disconnected || starting) return

  starting = true
  emitState()
  connection.start()
    .catch(() => { if (users > 0) scheduleRetry() })
    .finally(() => {
      starting = false
      emitState()
    })
}

// Занять соединение; возвращает функцию, которая его освобождает
export function acquireChat() {
  users += 1
  clearTimeout(stopTimer)
  start()

  let released = false
  return () => {
    if (released) return
    released = true
    users -= 1
    if (users > 0) return

    // небольшая пауза, чтобы соединение не закрывалось при переходе между страницами
    stopTimer = setTimeout(() => {
      if (users > 0) return
      clearTimeout(retryTimer)
      const c = connection
      connection = null
      c?.stop()
      emitState()
    }, STOP_DELAY_MS)
  }
}

// Вызвать метод на сервере; бросает ошибку, если соединения сейчас нет
export function invokeChat(method, ...args) {
  if (connection?.state !== HubConnectionState.Connected) {
    return Promise.reject(new Error('Нет соединения'))
  }
  return connection.invoke(method, ...args)
}
