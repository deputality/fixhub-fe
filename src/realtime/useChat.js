import { useEffect, useRef, useSyncExternalStore } from 'react'
import { acquireChat, getChatState, onChatEvent, onChatState } from './chatConnection'

// Держит соединение открытым, пока компонент на экране
export function useChatConnection() {
  useEffect(() => acquireChat(), [])
}

// Текущее состояние соединения: 'Connected', 'Connecting', 'Reconnecting' или 'Disconnected'
export function useChatState() {
  return useSyncExternalStore(onChatState, getChatState)
}

// Подписка на событие сервера; обработчик можно менять без переподписки
export function useChatEvent(name, handler) {
  const latest = useRef(handler)
  useEffect(() => {
    latest.current = handler
  })
  useEffect(() => onChatEvent(name, (...args) => latest.current?.(...args)), [name])
}

// Пока WebSocket недоступен, данные обновляются опросом
const FALLBACK_POLL_MS = 20000

// Держит список на странице свежим без перезагрузки. refresh вызывается, когда:
//  - сервер сообщил об изменении (по умолчанию OrdersChanged: новый заказ или новый статус);
//  - соединение (пере)подключилось: за это время события могли пропасть;
//  - человек вернулся на вкладку;
//  - WebSocket недоступен: тогда раз в 20 секунд.
// refresh должен обновлять данные «тихо», без экрана загрузки.
export function useLiveRefresh(refresh, eventName = 'OrdersChanged') {
  useChatConnection()
  const live = useChatState() === 'Connected'

  const latest = useRef(refresh)
  useEffect(() => {
    latest.current = refresh
  })

  useChatEvent(eventName, () => latest.current?.())

  useEffect(() => {
    if (live) latest.current?.()
  }, [live])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') latest.current?.()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  useEffect(() => {
    if (live) return undefined
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') latest.current?.()
    }, FALLBACK_POLL_MS)
    return () => clearInterval(t)
  }, [live])
}
