import { useEffect, useState } from 'react'
import { CircleAlert, Eye, EyeOff, Star } from 'lucide-react'
import { getAdminReviews, hideReview, showReview } from '../api/admin'
import { useToast } from '../context/ToastContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import Pagination from '../components/Pagination'
import Select from '../components/Select'
import { ReviewPhotos, ReviewReply } from '../components/ReviewExtras'
import './AdminPage.css'
import './AdminSections.css'

const PAGE_SIZE = 8

const FILTERS = [
  { value: 'all', label: 'Все отзывы' },
  { value: 'visible', label: 'Видимые' },
  { value: 'hidden', label: 'Скрытые' },
]

const toQuery = { all: undefined, visible: false, hidden: true }

function formatDateTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date}  ${time}`
}

function Stars({ value }) {
  return (
    <span className="as-stars" role="img" aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={14} fill={n <= value ? '#f59e0b' : 'none'} stroke={n <= value ? '#f59e0b' : '#cbd5e1'} />
      ))}
    </span>
  )
}

export default function AdminReviews() {
  const onAuthError = useAuthGuard()
  const { show } = useToast()
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [data, setData] = useState({ key: null, items: [], total: 0, totalPages: 0, error: '' })

  const key = `${filter}|${page}|${reload}`

  useEffect(() => {
    let cancelled = false
    getAdminReviews({ isHidden: toQuery[filter], page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setData({ key, items: res.items, total: res.totalCount, totalPages: res.totalPages, error: '' })
      })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setData({ key, items: [], total: 0, totalPages: 0, error: err?.error ?? 'Не удалось загрузить отзывы' })
      })
    return () => { cancelled = true }
  }, [key, filter, page, onAuthError])

  const loading = data.key !== key

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
  }

  async function toggle(review) {
    setBusyId(review.id)
    try {
      const updated = review.isHidden ? await showReview(review.id) : await hideReview(review.id)
      show(updated.isHidden ? 'Отзыв скрыт' : 'Отзыв снова виден')
      if (filter === 'all') {
        setData((d) => ({ ...d, items: d.items.map((r) => (r.id === updated.id ? updated : r)) }))
      } else {
        // в отфильтрованном списке отзыв уже не подходит, поэтому перезагружаем страницу
        if (data.items.length === 1 && page > 1) setPage(page - 1)
        else setReload((r) => r + 1)
      }
    } catch (err) {
      if (!onAuthError(err)) show(err?.error ?? 'Не удалось выполнить действие', 'error')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Отзывы</h1>
        <p>Модерация отзывов клиентов. Скрытый отзыв не виден на сайте и не входит в рейтинг.</p>
      </header>

      <section className="adm-panel">
        <div className="panel-head">
          <h2>Список отзывов</h2>
          <div className="as-filter">
            <Select value={filter} onChange={changeFilter} options={FILTERS} ariaLabel="Фильтр отзывов" />
          </div>
        </div>

        {data.error ? (
          <div className="form-alert adm-alert" role="alert">
            <CircleAlert size={18} />
            <span>
              {data.error}{' '}
              <button type="button" className="link-btn" onClick={() => setReload((r) => r + 1)}>Повторить</button>
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className={`adm-table as-table-reviews${loading ? ' is-loading' : ''}`}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Клиент</th>
                  <th>Услуга</th>
                  <th>Оценка</th>
                  <th>Отзыв</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody key={data.key}>
                {data.items.map((r) => (
                  <tr key={r.id} className={r.isHidden ? 'as-row-hidden' : ''}>
                    <td className="cell-id">#{r.id}</td>
                    <td>{r.clientName}</td>
                    <td className="as-service">{r.serviceTitle}</td>
                    <td><Stars value={r.rating} /></td>
                    <td className="as-text">{r.text}<ReviewPhotos photos={r.photoUrls} /><ReviewReply review={r} /></td>
                    <td className="cell-date">{formatDateTime(r.createdAt)}</td>
                    <td>
                      <span className={`pill ${r.isHidden ? 'st-blocked' : 'st-active'}`}>
                        {r.isHidden ? 'Скрыт' : 'Виден'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`act-btn ${r.isHidden ? 'unblock' : 'block'}`}
                        disabled={busyId === r.id}
                        onClick={() => toggle(r)}
                      >
                        {r.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                        {r.isHidden ? 'Показать' : 'Скрыть'}
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && data.items.length === 0 && (
                  <tr className="row-empty"><td colSpan={8}>Отзывов не найдено.</td></tr>
                )}
                {data.key === null && Array.from({ length: PAGE_SIZE }, (_, i) => (
                  <tr key={`sk-${i}`} className="row-skel"><td colSpan={8}><i className="skel" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel-foot">
          <span>Всего отзывов: <b>{data.total.toLocaleString('ru-RU')}</b></span>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </div>
      </section>
    </div>
  )
}
