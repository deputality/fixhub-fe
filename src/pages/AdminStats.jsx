import { useEffect, useState } from 'react'
import { CircleAlert, ClipboardList, LayoutGrid, MessageSquare, Users } from 'lucide-react'
import { getAdminStats } from '../api/admin'
import { useAuthGuard } from '../utils/useAuthGuard'
import './AdminPage.css'
import './AdminSections.css'

const STATUSES = [
  { key: 'New', label: 'Новые', color: '#3b82f6' },
  { key: 'Confirmed', label: 'Подтверждены', color: '#6366f1' },
  { key: 'InProgress', label: 'В работе', color: '#f59e0b' },
  { key: 'Completed', label: 'Выполнены', color: '#16a34a' },
  { key: 'Cancelled', label: 'Отменены', color: '#ef4444' },
]

const num = (n) => n.toLocaleString('ru-RU')
const money = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Block({ icon, tone, title, main, rows, loading }) {
  return (
    <div className="adm-stat as-block">
      <span className={`adm-stat-icon ${tone}`}>{icon}</span>
      <div className="adm-stat-body">
        <div className="adm-stat-label">{title}</div>
        {loading ? (
          <i className="adm-skel" style={{ width: 90, height: 28, margin: '8px 0 12px' }} />
        ) : (
          <div className="adm-stat-value">{main}</div>
        )}
        <dl className="as-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{loading ? '…' : value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

export default function AdminStats() {
  const onAuthError = useAuthGuard()
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    getAdminStats()
      .then((data) => { if (!cancelled) setState({ status: 'ready', data, error: '' }) })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setState({ status: 'error', data: null, error: err?.error ?? 'Не удалось загрузить статистику' })
      })
    return () => { cancelled = true }
  }, [reload, onAuthError])

  const s = state.data
  const loading = state.status === 'loading'

  if (state.status === 'error') {
    return (
      <div className="admin-page">
        <header className="admin-head"><h1>Статистика</h1></header>
        <div className="form-alert adm-alert" role="alert">
          <CircleAlert size={18} />
          <span>
            {state.error}{' '}
            <button type="button" className="link-btn" onClick={() => { setState({ status: 'loading', data: null, error: '' }); setReload((r) => r + 1) }}>
              Повторить
            </button>
          </span>
        </div>
      </div>
    )
  }

  const maxStatus = s ? Math.max(1, ...STATUSES.map((x) => s.ordersByStatus[x.key] ?? 0)) : 1

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Статистика</h1>
        <p>Подробные цифры по пользователям, услугам, заказам и отзывам платформы.</p>
      </header>

      <div className="adm-stats">
        <Block
          tone="adm-tone-blue" icon={<Users size={28} />} title="Пользователи" loading={loading}
          main={s && num(s.usersCount)}
          rows={[
            ['Клиенты', s && num(s.clientsCount)],
            ['Исполнители', s && num(s.performersCount)],
            ['Заблокированы', s && num(s.blockedUsersCount)],
          ]}
        />
        <Block
          tone="adm-tone-violet" icon={<LayoutGrid size={28} />} title="Услуги" loading={loading}
          main={s && num(s.servicesCount)}
          rows={[
            ['Опубликованы', s && num(s.activeServicesCount)],
            ['В архиве', s && num(s.servicesCount - s.activeServicesCount)],
          ]}
        />
        <Block
          tone="adm-tone-amber" icon={<ClipboardList size={28} />} title="Заказы" loading={loading}
          main={s && num(s.ordersCount)}
          rows={[
            ['За 30 дней', s && num(s.ordersLast30Days)],
            ['Сумма выполненных', s && <>{money(s.completedAmount)} BYN</>],
          ]}
        />
        <Block
          tone="adm-tone-green" icon={<MessageSquare size={28} />} title="Отзывы" loading={loading}
          main={s && num(s.reviewsCount)}
          rows={[
            ['Скрыто', s && num(s.hiddenReviewsCount)],
            ['Средний рейтинг', s && (s.averageRating == null ? '—' : s.averageRating.toLocaleString('ru-RU', { minimumFractionDigits: 1 }))],
          ]}
        />
      </div>

      <div className="as-two">
        <section className="adm-panel">
          <div className="adm-panel-head"><h2>Заказы по статусам</h2></div>
          <ul className="as-bars">
            {STATUSES.map((st) => {
              const value = s?.ordersByStatus[st.key] ?? 0
              return (
                <li key={st.key}>
                  <span className="as-bar-label">{st.label}</span>
                  <span className="as-bar-track">
                    <i style={{ width: loading ? 0 : `${(value / maxStatus) * 100}%`, background: st.color }} />
                  </span>
                  <b>{loading ? '…' : num(value)}</b>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head"><h2>Лучшие исполнители</h2></div>
          <div className="adm-table-wrap">
            <table className="adm-table as-table-top">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Исполнитель</th>
                  <th>Выполнено</th>
                  <th>Сумма</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 3 }, (_, i) => (
                  <tr key={`sk-${i}`} className="adm-row-skel"><td colSpan={4}><i className="adm-skel" /></td></tr>
                ))}
                {s?.topPerformers.map((p, i) => (
                  <tr key={p.performerId}>
                    <td className="adm-cell-id">{i + 1}</td>
                    <td>{p.performerName}</td>
                    <td>{num(p.completedOrders)}</td>
                    <td className="adm-cell-date">{money(p.completedAmount)} BYN</td>
                  </tr>
                ))}
                {s && s.topPerformers.length === 0 && (
                  <tr className="adm-row-empty"><td colSpan={4}>Выполненных заказов пока нет.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
