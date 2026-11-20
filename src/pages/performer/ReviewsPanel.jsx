import { useEffect, useState } from 'react'
import { CircleAlert, Star } from 'lucide-react'
import { getPerformerReviews } from '../../api/performer'
import { useAuthGuard } from '../../utils/useAuthGuard'

const PAGE = 6

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function Stars({ value }) {
  return (
    <span className="pf-stars" role="img" aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={15} fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : '#cbd5e1'} />
      ))}
    </span>
  )
}

export default function ReviewsPanel() {
  const guard = useAuthGuard()
  const [state, setState] = useState({ status: 'loading', rating: null, total: 0, items: [], page: 1, totalPages: 1, error: '' })
  const [more, setMore] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPerformerReviews({ page: 1, pageSize: PAGE })
      .then((d) => {
        if (cancelled) return
        setState({
          status: 'ready', rating: d.rating, total: d.reviewCount,
          items: d.reviews.items, page: d.reviews.page, totalPages: d.reviews.totalPages, error: '',
        })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState((s) => ({ ...s, status: 'error', error: err?.error ?? 'Не удалось загрузить отзывы' }))
      })
    return () => { cancelled = true }
  }, [guard])

  async function loadMore() {
    setMore(true)
    try {
      const d = await getPerformerReviews({ page: state.page + 1, pageSize: PAGE })
      setState((s) => ({ ...s, items: [...s.items, ...d.reviews.items], page: d.reviews.page, totalPages: d.reviews.totalPages }))
    } catch (err) {
      guard(err)
    } finally {
      setMore(false)
    }
  }

  return (
    <section className="pf-panel">
      <div className="pf-panel-top">
        <div>
          <h2>Отзывы</h2>
          <p className="pf-panel-lead">Что клиенты пишут о вашей работе.</p>
        </div>
        {state.rating != null && (
          <div className="pf-rating-pill">
            <Star size={18} fill="#f59e0b" stroke="#f59e0b" />
            <b>{Number(state.rating).toFixed(1)}</b>
            <span>на основе {state.total}</span>
          </div>
        )}
      </div>

      {state.status === 'loading' && (
        <div aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton pf-sk-row" />)}</div>
      )}
      {state.status === 'error' && (
        <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>
      )}
      {state.status === 'ready' && state.items.length === 0 && (
        <div className="empty">
          <Star size={42} strokeWidth={1.5} />
          <h3>Отзывов пока нет</h3>
          <p>Отзыв появится после того, как клиент оценит выполненный заказ</p>
        </div>
      )}

      {state.items.length > 0 && (
        <ul className="pf-reviews">
          {state.items.map((r) => (
            <li key={r.id} className="pf-review">
              <span className="avatar">{initials(r.clientName)}</span>
              <div className="pf-review-body">
                <div className="pf-review-top">
                  <b>{r.clientName}</b>
                  <span>{new Date(r.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <Stars value={r.rating} />
                <div className="pf-review-service">{r.serviceTitle}</div>
                <p>{r.text}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {state.status === 'ready' && state.page < state.totalPages && (
        <button type="button" className="pf-more" onClick={loadMore} disabled={more}>
          {more ? 'Загрузка...' : 'Показать ещё'}
        </button>
      )}
    </section>
  )
}
