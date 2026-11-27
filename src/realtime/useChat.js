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
