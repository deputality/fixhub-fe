import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { getAuditLog } from '../../api/admin'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import './AdminPage.css'
import './AdminSections.css'

const PAGE_SIZE = 15

const FILTERS = [
  { value: '', label: 'Все действия' },
  { value: 'User', label: 'Пользователи' },
  { value: 'Review', label: 'Отзывы' },
  { value: 'Category', label: 'Категории' },
  { value: 'Complaint', label: 'Жалобы' },
]

// «Администратор Имя ... » + подпись действия
const ACTIONS = {
  'user.block': { label: 'Заблокировал пользователя', tone: 'bad' },
  'user.unblock': { label: 'Разблокировал пользователя', tone: 'good' },
  'user.verify': { label: 'Подтвердил мастера', tone: 'good' },
  'user.unverify': { label: 'Снял проверку с мастера', tone: 'neutral' },
  'review.hide': { label: 'Скрыл отзыв', tone: 'bad' },
  'review.show': { label: 'Вернул отзыв', tone: 'good' },
  'category.create': { label: 'Создал категорию', tone: 'good' },
  'category.update': { label: 'Изменил категорию', tone: 'neutral' },
  'category.delete': { label: 'Удалил категорию', tone: 'bad' },
  'category.hide': { label: 'Скрыл категорию', tone: 'bad' },
  'category.show': { label: 'Вернул категорию', tone: 'good' },
  'complaint.resolve': { label: 'Принял жалобу', tone: 'good' },
  'complaint.reject': { label: 'Отклонил жалобу', tone: 'neutral' },
}

const TARGET_LABEL = { User: 'Пользователь', Review: 'Отзыв', Category: 'Категория', Complaint: 'Жалоба' }

function formatDateTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date}  ${time}`
}

export default function AdminAudit() {
  const onAuthError = useAuthGuard()
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [data, setData] = useState({ key: null, items: [], total: 0, totalPages: 0, error: '' })

  const key = `${filter}|${page}|${reload}`

  useEffect(() => {
    let cancelled = false
    getAuditLog({ targetType: filter, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setData({ key, items: res.items, total: res.totalCount, totalPages: res.totalPages, error: '' })
      })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setData({ key, items: [], total: 0, totalPages: 0, error: err?.error ?? 'Не удалось загрузить журнал' })
      })
    return () => { cancelled = true }
  }, [key, filter, page, onAuthError])

  const loading = data.key !== key

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
  }

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Журнал действий</h1>
        <p>Что и когда делали администраторы: блокировки, проверки мастеров, модерация отзывов и категорий.</p>
      </header>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <h2>Последние действия</h2>
          <div className="as-filter">
            <Select value={filter} onChange={changeFilter} options={FILTERS} ariaLabel="Фильтр журнала" />
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
          <div className="adm-table-wrap">
            <table className={`adm-table as-table-audit${loading ? ' is-loading' : ''}`}>
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Администратор</th>
                  <th>Действие</th>
                  <th>Объект</th>
                </tr>
              </thead>
              <tbody key={data.key}>
                {data.items.map((a) => {
                  const action = ACTIONS[a.action] ?? { label: a.action, tone: 'neutral' }
                  return (
                    <tr key={a.id}>
                      <td className="adm-cell-date" data-label="Дата">{formatDateTime(a.createdAt)}</td>
                      <td data-label="Администратор">{a.adminName}</td>
                      <td data-label="Действие"><span className={`as-act ${action.tone}`}>{action.label}</span></td>
                      <td className="as-target" data-label="Объект">
                        <b>{a.targetName || `№${a.targetId}`}</b>
                        <span>{TARGET_LABEL[a.targetType] ?? a.targetType}{a.details ? ` · ${a.details}` : ''}</span>
                      </td>
                    </tr>
                  )
                })}

                {!loading && data.items.length === 0 && (
                  <tr className="adm-row-empty"><td colSpan={4}>Действий пока нет.</td></tr>
                )}
                {data.key === null && Array.from({ length: 8 }, (_, i) => (
                  <tr key={`sk-${i}`} className="adm-row-skel"><td colSpan={4}><i className="adm-skel" /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="adm-panel-foot">
          <span>Всего записей: <b>{data.total.toLocaleString('ru-RU')}</b></span>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </div>
      </section>
    </div>
  )
}
