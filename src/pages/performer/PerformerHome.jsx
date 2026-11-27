import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CircleCheck, Coins, Plus, Star } from 'lucide-react'
import { getPerformerReviews } from '../../api/performer'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/common/Button'
import OrdersPanel from './OrdersPanel'
import ReviewsPanel from './ReviewsPanel'
import ServicesPanel from './ServicesPanel'
import './PerformerPages.css'

const TABS = [
  { value: 'services', label: 'Мои услуги' },
  { value: 'orders', label: 'Входящие заказы' },
  { value: 'reviews', label: 'Отзывы' },
]

function Stars({ value }) {
  const rounded = Math.round(Number(value) || 0)
  return (
    <span className="pf-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={20} fill={n <= rounded ? '#f59e0b' : 'none'} stroke={n <= rounded ? '#f59e0b' : '#cbd5e1'} />
      ))}
    </span>
  )
}

export default function PerformerHome() {
  const { user } = useAuth()
  const { stats, reloadStats } = useOutletContext()
  const [tab, setTab] = useState('orders')
  const [addTick, setAddTick] = useState(0)
  const [rating, setRating] = useState({ loaded: false, value: null, count: 0 })

  useEffect(() => {
    let cancelled = false
    getPerformerReviews({ pageSize: 1 })
      .then((d) => { if (!cancelled) setRating({ loaded: true, value: d.rating, count: d.reviewCount }) })
      .catch(() => { if (!cancelled) setRating({ loaded: true, value: null, count: 0 }) })
    return () => { cancelled = true }
  }, [])

  function changeTab(value) {
    setTab(value)
    setAddTick(0)
  }

  function addService() {
    setTab('services')
    setAddTick((t) => t + 1)
  }

  const firstName = user.fullName.split(' ')[0]

  return (
    <div className="pf-home">
      <h1 className="pf-title">Добро пожаловать, {firstName}!</h1>
      <p className="pf-lead">Здесь вы можете управлять своими заказами, услугами и получать новые заявки.</p>

      <div className="pf-stats">
        <div className="pf-stat">
          <span className="pf-stat-icon pf-tone-green"><CircleCheck size={30} /></span>
          <div>
            <div className="pf-stat-label">Выполнено заказов</div>
            <div className="pf-stat-value">{stats ? stats.completedOrders : '—'}</div>
            <div className="pf-stat-note">За всё время</div>
          </div>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-icon pf-tone-blue"><Coins size={30} /></span>
          <div>
            <div className="pf-stat-label">Общая сумма</div>
            <div className="pf-stat-value">{stats ? `${stats.completedAmount} BYN` : '—'}</div>
            <div className="pf-stat-note">По выполненным заказам</div>
          </div>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-icon pf-tone-amber"><Star size={30} fill="currentColor" /></span>
          <div>
            <div className="pf-stat-label">Рейтинг</div>
            <div className="pf-stat-value">
              {rating.loaded && rating.value != null ? Number(rating.value).toFixed(1) : '—'}
              {rating.value != null && <Stars value={rating.value} />}
            </div>
            <div className="pf-stat-note">
              {rating.loaded ? (rating.count > 0 ? `На основе ${rating.count} отзывов` : 'Пока нет отзывов') : ' '}
            </div>
          </div>
        </div>
      </div>

      <div className="pf-toolbar">
        <div className="pf-tabs" role="tablist" style={{ '--i': TABS.findIndex((t) => t.value === tab), '--n': TABS.length }}>
          <span className="pf-tab-pill" aria-hidden="true" />
          {TABS.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={tab === t.value}
              className={tab === t.value ? 'active' : ''} onClick={() => changeTab(t.value)}>
              {t.label}
              {t.value === 'orders' && stats?.newOrders > 0 && <span className="pf-tab-dot">{stats.newOrders}</span>}
            </button>
          ))}
        </div>
        <Button onClick={addService}><Plus size={18} /> Добавить услугу</Button>
      </div>

      <div key={tab} className="pf-tab-body">
        {tab === 'services' && <ServicesPanel createRequest={addTick} hideAdd />}
        {tab === 'orders' && <OrdersPanel onChanged={reloadStats} />}
        {tab === 'reviews' && <ReviewsPanel />}
      </div>
    </div>
  )
}

