import { useState } from 'react'
import { History } from 'lucide-react'
import { getOrder } from '../../api/orders'
import '../common/Features.css'

const LABELS = {
  New: 'Новый', Confirmed: 'Подтверждён', InProgress: 'В работе', Completed: 'Выполнен', Cancelled: 'Отменён',
}

function when(iso) {
  return new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Журнал статусов заказа: загружается по нажатию, причина отмены выводится в строке отмены
export default function OrderHistory({ orderId }) {
  const [state, setState] = useState({ open: false, loading: false, items: null, error: '' })

  async function toggle() {
    if (state.open) return setState((s) => ({ ...s, open: false }))
    setState((s) => ({ ...s, open: true }))
    if (state.items) return
    setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const order = await getOrder(orderId)
      setState((s) => ({ ...s, loading: false, items: order.history ?? [] }))
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err?.error ?? 'Не удалось загрузить историю' }))
    }
  }

  return (
    <div className="hist">
      <button type="button" className="rv-link" onClick={toggle}>
        <History size={13} /> {state.open ? 'Скрыть историю' : 'История статусов'}
      </button>
      {state.open && state.loading && <div className="slot-note">Загрузка...</div>}
      {state.open && state.error && <div className="slot-note">{state.error}</div>}
      {state.open && state.items && (
        <ul className="hist-list">
          {state.items.map((h, i) => (
            <li key={i}>
              {LABELS[h.toStatus] ?? h.toStatus} — {h.changedByName} <span>{when(h.changedAt)}</span>
              {h.reason && <> · <em>Причина: {h.reason}</em></>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
