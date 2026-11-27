import { useCallback, useEffect, useState } from 'react'
import { getUnreadChats } from '../api/messages'
import { useChatConnection, useChatEvent, useChatState } from '../realtime/useChat'

// Пока WebSocket недоступен, значки обновляются опросом, как раньше
const FALLBACK_POLL_MS = 20000

// { [orderId]: количество непрочитанных } и функция для ручного обновления.
// Значки меняются сами: сервер присылает UnreadChanged, как только приходит или прочитывается сообщение
export function useUnreadChats() {
  const [unread, setUnread] = useState({})

  useChatConnection()
  const live = useChatState() === 'Connected'

  const refresh = useCallback(() => {
    getUnreadChats()
      .then((list) => setUnread(Object.fromEntries(list.map((i) => [i.orderId, i.count]))))
      .catch(() => {})
  }, [])

  // при открытии и после каждого (пере)подключения: могли пропустить события
  useEffect(() => {
    refresh()
  }, [refresh, live])

  useChatEvent('UnreadChanged', ({ orderId, count }) => {
    setUnread((u) => {
      if (count > 0) return { ...u, [orderId]: count }
      const { [orderId]: _removed, ...rest } = u
      return rest
    })
  })

  useEffect(() => {
    if (live) return undefined
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, FALLBACK_POLL_MS)
    return () => clearInterval(t)
  }, [live, refresh])

  return { unread, refresh }
}
