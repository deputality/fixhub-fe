import { useCallback, useEffect, useState } from 'react'
import { getUnreadChats } from '../api/messages'

const POLL_MS = 20000

// { [orderId]: количество непрочитанных } и функция для ручного обновления
export function useUnreadChats() {
  const [unread, setUnread] = useState({})

  const refresh = useCallback(() => {
    getUnreadChats()
      .then((list) => setUnread(Object.fromEntries(list.map((i) => [i.orderId, i.count]))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, POLL_MS)
    return () => clearInterval(t)
  }, [refresh])

  return { unread, refresh }
}
