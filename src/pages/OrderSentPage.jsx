import { Link, Navigate, useLocation } from 'react-router-dom'
import {
  Check, ChevronRight, ClipboardList, Clock, MapPin, MessageCircle, Phone, User, Wrench,
} from 'lucide-react'
import './OrderSentPage.css'

const UNITS = { Hour: 'час', Piece: 'шт.' }

function plural(n, [one, few, many]) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const requests = (n) => `${n} ${plural(n, ['заявка', 'заявки', 'заявок'])}`
const services = (n) => `${n} ${plural(n, ['услуга', 'услуги', 'услуг'])}`
const money = (n) => n.toLocaleString('ru-RU', { maximumFractionDigits: 2 })

function formatDate(iso) {
  if (!iso) return 'не указана'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function Thumb({ photo, color }) {
  return (
    <span className="os-photo" style={{ '--cat': color ?? '#64748b' }}>
      {photo ? <img src={photo} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} /> : <Wrench size={26} strokeWidth={1.6} />}
    </span>
  )
}

export default function OrderSentPage() {
  const { state } = useLocation()

  // страницу открыли напрямую или обновили: данных об оформлении уже нет
  if (!state?.orders?.length) return <Navigate to="/orders" replace />

  const { orders, contact, services: snapshot = [] } = state
  const extra = Object.fromEntries(snapshot.map((s) => [s.serviceId, s]))

  // каждая позиция заказа показывается отдельной заявкой
  const rows = orders.flatMap((order) =>
    order.items.map((item) => ({ ...item, order, ...extra[item.serviceId] })),
  )
  const total = orders.reduce((sum, o) => sum + o.totalAmount, 0)
  const masters = [...new Set(orders.map((o) => o.performerName))]
  const single = masters.length === 1

  return (
    <div className="os">
      <nav className="os-crumbs" aria-label="Навигация">
        <Link to="/cart">Корзина</Link>
        <ChevronRight size={14} />
        <span>Заявки отправлены</span>
      </nav>

      <header className="os-head">
        <span className="os-check"><Check size={30} strokeWidth={1.8} /></span>
        <div>
          <h1>Ваши заявки отправлены</h1>
          <p>
            {requests(rows.length)} переданы {single ? 'мастеру' : 'мастерам'}: {masters.join(', ')}.{' '}
            {single ? 'Мастер ещё не подтвердил их' : 'Мастера ещё не подтвердили их'} — дата и стоимость пока не согласованы.
          </p>
        </div>
      </header>

      <section className="os-steps">
        <div className="os-step">
          <span className="os-step-icon"><Check size={18} /></span>
          <div>
            <b>Заявки отправлены</b>
            <span>Все {rows.length} {plural(rows.length, ['заявка сохранена', 'заявки сохранены', 'заявок сохранены'])} в «Моих заказах».</span>
          </div>
        </div>
        <div className="os-step current">
          <span className="os-step-icon"><Clock size={18} /></span>
          <div>
            <b>Ожидаем подтверждения мастера</b>
            <span>
              {single ? `${masters[0].split(' ')[0]} рассмотрит ваши заявки.` : 'Мастера рассмотрят ваши заявки.'}
            </span>
          </div>
        </div>
        <div className="os-step">
          <span className="os-step-icon"><MessageCircle size={18} /></span>
          <div>
            <b>Согласование деталей</b>
            <span>Обсудите с мастером дату и итоговую стоимость.</span>
          </div>
        </div>
      </section>

      <div className="os-grid">
        <section className="os-card os-list-card">
          <div className="os-card-head">
            <h2>Отправленные заявки</h2>
            <span>{requests(rows.length)}</span>
          </div>
          <p className="os-hint">Каждая услуга отправлена отдельной заявкой.</p>

          <ul className="os-list">
            {rows.map((r, i) => {
              const unit = UNITS[r.unit]
              return (
                <li key={r.id} style={{ animationDelay: `${0.12 + i * 0.06}s` }}>
                  <Thumb photo={r.photo} color={r.color} />
                  <div className="os-info">
                    <div className="os-title">{r.serviceTitle}</div>
                    <div className="os-master">{r.order.performerName}</div>
                    <div className="os-meta">
                      Желаемая дата: {formatDate(r.desiredDate)} <i>·</i> Количество: {r.quantity}
                    </div>
                  </div>
                  <div className="os-right">
                    <span className="os-pill">Ожидает подтверждения</span>
                    <div className="os-price">От {money(r.unitPrice)} BYN{unit && `/${unit}`}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <aside className="os-side">
          <section className="os-card">
            <div className="os-side-title">Предварительная стоимость</div>
            <div className="os-total">
              <b>{money(total)} BYN</b>
              <span>{services(rows.length)}</span>
            </div>
            <p className="os-note">Это оценка из корзины. Итоговую стоимость вы согласуете с мастером.</p>
          </section>

          <section className="os-card">
            <h2 className="os-contact-title">Данные для мастера</h2>
            <ul className="os-contact">
              <li><User size={20} /> {contact.name}</li>
              <li><Phone size={20} /> {contact.phone}</li>
              <li><MapPin size={20} /> {contact.address}</li>
            </ul>
            <p className="os-note small">Эти данные указаны во всех {rows.length} {plural(rows.length, ['заявке', 'заявках', 'заявках'])}.</p>
          </section>
        </aside>
      </div>

      <section className="os-card os-follow">
        <ClipboardList size={26} className="os-follow-icon" />
        <h2>Следите за ответом в «Моих заказах»</h2>
        <p>Там можно проверить статус каждой заявки или отменить её, если планы изменятся.</p>
        <div className="os-buttons">
          <Link to="/orders" className="btn btn-primary">Мои заказы</Link>
          <Link to="/" className="btn btn-outline">Вернуться в каталог</Link>
        </div>
      </section>
    </div>
  )
}
