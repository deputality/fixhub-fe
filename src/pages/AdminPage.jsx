import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, Ban, Calendar, CircleAlert, CircleCheck, ClipboardList,
  Coins, Minus, Search, ShieldCheck, ShieldOff, Star, Users,
} from 'lucide-react'
import {
  blockUser, getAdminStats, getAdminUsers, getOrdersByDay, unblockUser, unverifyUser, verifyUser,
} from '../api/admin'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Pagination from '../components/Pagination'
import Select from '../components/Select'
import './AdminPage.css'

const PAGE_SIZE = 6

const PERIODS = [
  { value: 7, label: 'Последние 7 дней' },
  { value: 14, label: 'Последние 14 дней' },
  { value: 30, label: 'Последние 30 дней' },
]

const ROLES = {
  Client: { label: 'Клиент', cls: 'role-client' },
  Performer: { label: 'Исполнитель', cls: 'role-performer' },
  Admin: { label: 'Админ', cls: 'role-admin' },
}

// быстрые фильтры над таблицей пользователей
const USER_TABS = [
  { id: 'all', label: 'Все' },
  { id: 'performers', label: 'Мастера', role: 'Performer' },
  { id: 'pending', label: 'Ждут проверки', role: 'Performer', isVerified: false },
]

const num = (n) => n.toLocaleString('ru-RU')
const money = (n) => n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function formatDateTime(iso) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${date}  ${time}`
}

// при протухшем токене (401) выходим и отправляем на страницу входа
function useAuthGuard() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { show } = useToast()
  const live = useRef({})
  useEffect(() => { live.current = { logout, navigate, show } })

  return useCallback((err) => {
    if (err?.status !== 401) return false
    live.current.logout()
    live.current.show('Сессия истекла, войдите снова', 'error')
    live.current.navigate('/login')
    return true
  }, [])
}

/* карточки со статистикой */

function Delta({ value, unit }) {
  if (value == null) return null
  if (value === 0) {
    return <div className="delta flat"><Minus size={14} /> 0{unit}</div>
  }
  const up = value > 0
  return (
    <div className={`delta ${up ? 'up' : 'down'}`}>
      {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      {Math.abs(value).toLocaleString('ru-RU')}{unit}
    </div>
  )
}

function StatCard({ icon, tone, label, value, delta, unit, loading }) {
  return (
    <div className="stat">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        {loading ? (
          <>
            <i className="skel" style={{ width: 110, height: 28, margin: '8px 0 10px' }} />
            <i className="skel" style={{ width: 90, height: 12 }} />
          </>
        ) : (
          <>
            <div className="stat-value">{value}</div>
            <Delta value={delta} unit={unit} />
            <div className="stat-note">за последние 7 дней</div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCards({ state, onRetry }) {
  const loading = state.status === 'loading'
  const s = state.data

  if (state.status === 'error') {
    return (
      <div className="form-alert adm-alert" role="alert">
        <CircleAlert size={18} />
        <span>{state.error} <button type="button" className="link-btn" onClick={onRetry}>Повторить</button></span>
      </div>
    )
  }

  return (
    <div className="stats">
      <StatCard
        tone="tone-blue" icon={<Users size={28} />} label="Всего пользователей" loading={loading}
        value={s && num(s.usersCount)} delta={s?.usersGrowthPercent} unit=" %"
      />
      <StatCard
        tone="tone-violet" icon={<ClipboardList size={28} />} label="Всего заказов" loading={loading}
        value={s && num(s.ordersCount)} delta={s?.ordersGrowthPercent} unit=" %"
      />
      <StatCard
        tone="tone-amber" icon={<Star size={28} />} label="Средний рейтинг" loading={loading}
        value={s && (s.averageRating == null ? '—' : s.averageRating.toLocaleString('ru-RU', { minimumFractionDigits: 1 }))}
        delta={s?.ratingChange} unit=""
      />
      <StatCard
        tone="tone-green" icon={<Coins size={28} />} label="Общая сумма заказов" loading={loading}
        value={s && <>{money(s.completedAmount)} <small>BYN</small></>}
        delta={s?.amountGrowthPercent} unit=" %"
      />
    </div>
  )
}

/* график «Заказы по дням» */

const W = 1000
const H = 250
const PAD = { l: 46, r: 18, t: 14, b: 34 }

// максимум по оси Y: округляем вверх так, чтобы было ровно 4 деления с «красивым» шагом
function niceScale(max) {
  if (max <= 4) return { step: 1, top: 4 }
  const rough = max / 4
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= rough)
  return { step, top: step * 4 }
}

function dayLabel(dateStr) {
  return new Date(`${dateStr}T00:00:00`)
    .toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    .replace('.', '')
}

function OrdersChart({ points }) {
  const [hover, setHover] = useState(null)

  const n = points.length
  const { step, top } = niceScale(Math.max(0, ...points.map((p) => p.count)))
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const base = PAD.t + innerH

  const x = (i) => (n === 1 ? PAD.l + innerW / 2 : PAD.l + (innerW * i) / (n - 1))
  const y = (v) => base - (v / top) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`

  const ticks = [0, 1, 2, 3, 4].map((k) => k * step)
  const labelEvery = Math.ceil(n / 15)
  const colW = n > 1 ? innerW / (n - 1) : innerW

  const hp = hover == null ? null : points[hover]
  const tipLeft = hover == null ? 0 : Math.min(90, Math.max(10, (x(hover) / W) * 100))

  return (
    <div className="chart" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="График количества заказов по дням">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity=".16" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity=".03" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="chart-grid" />
            <text x={PAD.l - 10} y={y(t) + 4} textAnchor="end" className="chart-text">{t}</text>
          </g>
        ))}

        {points.map((p, i) => (
          <g key={p.date}>
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={base} className="chart-grid" />
            {i % labelEvery === 0 && (
              <text x={x(i)} y={H - 10} textAnchor="middle" className="chart-text">{dayLabel(p.date)}</text>
            )}
          </g>
        ))}

        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={base} className="chart-guide" />}

        <path d={area} fill="url(#chart-fill)" className="chart-area" />
        <path d={line} pathLength="1" className="chart-line" />

        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={x(i)}
            cy={y(p.count)}
            r={hover === i ? 6 : 4}
            className="chart-dot"
            style={{ animationDelay: `${0.5 + (i / n) * 0.5}s` }}
          />
        ))}

        {points.map((p, i) => (
          <rect
            key={p.date}
            x={x(i) - colW / 2}
            y={PAD.t}
            width={colW}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
      </svg>

      {hp && (
        <div className="chart-tip" style={{ left: `${tipLeft}%`, top: `${(y(hp.count) / H) * 100}%` }}>
          <b>{hp.count}</b> {ordersWord(hp.count)}
          <span>{dayLabel(hp.date)}</span>
        </div>
      )}
    </div>
  )
}

function ordersWord(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'заказ'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'заказа'
  return 'заказов'
}

function OrdersPanel({ onAuthError }) {
  const [days, setDays] = useState(14)
  const [chart, setChart] = useState({ status: 'loading', points: [] })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    getOrdersByDay(days)
      .then((points) => { if (!cancelled) setChart({ status: 'ready', points }) })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setChart({ status: 'error', points: [] })
      })
    return () => { cancelled = true }
  }, [days, reload, onAuthError])

  function changeDays(value) {
    setDays(value)
    setChart((c) => ({ ...c, status: 'loading' }))
  }

  return (
    <section className="adm-panel">
      <div className="panel-head">
        <h2>Заказы по дням</h2>
        <div className="period">
          <Calendar size={16} />
          <Select value={days} onChange={changeDays} options={PERIODS} ariaLabel="Период" />
        </div>
      </div>

      {chart.status === 'error' ? (
        <div className="form-alert adm-alert" role="alert">
          <CircleAlert size={18} />
          <span>
            Не удалось загрузить график.{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => { setChart({ status: 'loading', points: [] }); setReload((r) => r + 1) }}
            >
              Повторить
            </button>
          </span>
        </div>
      ) : chart.points.length === 0 ? (
        <i className="skel" style={{ height: 250 }} />
      ) : (
        <div className={chart.status === 'loading' ? 'chart-wrap is-loading' : 'chart-wrap'}>
          <OrdersChart key={days} points={chart.points} />
        </div>
      )}
    </section>
  )
}

/* таблица пользователей */

function UsersPanel({ onAuthError }) {
  const { show } = useToast()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const [tab, setTab] = useState('all')
  const [data, setData] = useState({ key: null, items: [], total: 0, totalPages: 0, error: '' })

  // запрос уходит не на каждую букву, а когда человек перестал печатать
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const key = `${query}|${tab}|${page}|${reload}`

  useEffect(() => {
    let cancelled = false
    const { role, isVerified } = USER_TABS.find((t) => t.id === tab)
    getAdminUsers({ search: query, role, isVerified, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setData({ key, items: res.items, total: res.totalCount, totalPages: res.totalPages, error: '' })
      })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setData({ key, items: [], total: 0, totalPages: 0, error: err?.error ?? 'Не удалось загрузить пользователей' })
      })
    return () => { cancelled = true }
  }, [key, query, tab, page, onAuthError])

  // пока ключ загруженных данных не совпал с текущим, показываем старые строки приглушёнными
  const loading = data.key !== key

  async function toggleBlock(user) {
    setBusyId(user.id)
    try {
      const updated = user.isBlocked ? await unblockUser(user.id) : await blockUser(user.id)
      setData((d) => ({ ...d, items: d.items.map((u) => (u.id === updated.id ? updated : u)) }))
      show(updated.isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован')
    } catch (err) {
      if (!onAuthError(err)) show(err?.error ?? 'Не удалось выполнить действие', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleVerify(user) {
    setBusyId(user.id)
    try {
      const updated = user.isVerified ? await unverifyUser(user.id) : await verifyUser(user.id)
      setData((d) => ({
        ...d,
        // во вкладке «Ждут проверки» подтверждённый мастер сразу уходит из списка
        items: tab === 'pending' && updated.isVerified
          ? d.items.filter((u) => u.id !== updated.id)
          : d.items.map((u) => (u.id === updated.id ? updated : u)),
        total: tab === 'pending' && updated.isVerified ? Math.max(0, d.total - 1) : d.total,
      }))
      show(updated.isVerified ? 'Мастер подтверждён' : 'Отметка проверки снята')
    } catch (err) {
      if (!onAuthError(err)) show(err?.error ?? 'Не удалось выполнить действие', 'error')
    } finally {
      setBusyId(null)
    }
  }

  function changeTab(id) {
    setTab(id)
    setPage(1)
  }

  return (
    <section className="adm-panel">
      <div className="panel-head">
        <h2>Пользователи</h2>
        <label className="adm-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по email, имени…"
            aria-label="Поиск пользователей"
            maxLength={100}
          />
        </label>
      </div>

      <div className="adm-tabs" role="tablist" aria-label="Фильтр пользователей">
        {USER_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`adm-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => changeTab(t.id)}
          >
            {t.label}
          </button>
        ))}
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
          <table className={`adm-table${loading ? ' is-loading' : ''}`}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>Имя</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Проверка</th>
                <th>Дата регистрации</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody key={data.key}>
              {data.items.map((u) => {
                const role = ROLES[u.role] ?? { label: u.role, cls: '' }
                const busy = busyId === u.id
                return (
                  <tr key={u.id}>
                    <td className="cell-id" data-label="ID">#{u.id}</td>
                    <td className="cell-main">
                      <div className="cell-email">
                        <span className="mini-avatar">{initials(u.fullName)}</span>
                        <a href={`mailto:${u.email}`} title={u.email}>{u.email}</a>
                      </div>
                    </td>
                    <td data-label="Имя">{u.fullName}</td>
                    <td data-label="Роль"><span className={`pill ${role.cls}`}>{role.label}</span></td>
                    <td data-label="Статус">
                      <span className={`pill ${u.isBlocked ? 'st-blocked' : 'st-active'}`}>
                        {u.isBlocked ? 'Заблокирован' : 'Активен'}
                      </span>
                    </td>
                    <td data-label="Проверка">
                      {u.role === 'Performer' ? (
                        <span className={`pill ${u.isVerified ? 'st-verified' : 'st-unverified'}`}>
                          {u.isVerified ? 'Проверен' : 'Не проверен'}
                        </span>
                      ) : (
                        <span className="cell-none">—</span>
                      )}
                    </td>
                    <td className="cell-date" data-label="Регистрация">{formatDateTime(u.createdAt)}</td>
                    <td className="cell-act">
                      {u.role === 'Admin' ? (
                        <span className="cell-none">—</span>
                      ) : (
                        <div className="cell-actions">
                          {u.role === 'Performer' && (
                            <button
                              type="button"
                              className={`act-btn ${u.isVerified ? 'unverify' : 'verify'}`}
                              disabled={busy}
                              onClick={() => toggleVerify(u)}
                            >
                              {u.isVerified ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                              {u.isVerified ? 'Снять проверку' : 'Подтвердить'}
                            </button>
                          )}
                          <button
                            type="button"
                            className={`act-btn ${u.isBlocked ? 'unblock' : 'block'}`}
                            disabled={busy}
                            onClick={() => toggleBlock(u)}
                          >
                            {u.isBlocked ? <CircleCheck size={15} /> : <Ban size={15} />}
                            {u.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}

              {!loading && data.items.length === 0 && (
                <tr className="row-empty"><td colSpan={8}>Никого не нашли. Попробуйте изменить запрос или фильтр.</td></tr>
              )}
              {data.key === null && Array.from({ length: PAGE_SIZE }, (_, i) => (
                <tr key={`sk-${i}`} className="row-skel"><td colSpan={8}><i className="skel" /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="panel-foot">
        <span>Всего пользователей: <b>{num(data.total)}</b></span>
        <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
      </div>
    </section>
  )
}

export default function AdminPage() {
  const onAuthError = useAuthGuard()
  const [stats, setStats] = useState({ status: 'loading', data: null, error: '' })
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    getAdminStats()
      .then((data) => { if (!cancelled) setStats({ status: 'ready', data, error: '' }) })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setStats({ status: 'error', data: null, error: err?.error ?? 'Не удалось загрузить статистику.' })
      })
    return () => { cancelled = true }
  }, [onAuthError, reload])

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Панель администратора</h1>
        <p>Общая статистика и управление пользователями платформы FixHub.</p>
      </header>

      <StatCards
        state={stats}
        onRetry={() => { setStats({ status: 'loading', data: null, error: '' }); setReload((r) => r + 1) }}
      />
      <OrdersPanel onAuthError={onAuthError} />
      <UsersPanel onAuthError={onAuthError} />
    </div>
  )
}