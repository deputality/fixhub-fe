import { useEffect, useState } from 'react'
import { getVerification } from '../api/verification'

// Лимиты мастера: у непроверенного их больше, после проверки администратором они снимаются.
// Пока данные не загрузились (или не загрузились совсем), возвращает null: интерфейс тогда
// ничего не блокирует, а сервер всё равно проверит лимиты сам.
// { isVerified, limits: { maxServices (null = без ограничений), maxPortfolioItems, canSendOffers } }
export function useVerificationLimits() {
  const [state, setState] = useState(null)

  useEffect(() => {
    let cancelled = false
    getVerification()
      .then((d) => { if (!cancelled) setState({ isVerified: d.isVerified, limits: d.limits }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return state
}
