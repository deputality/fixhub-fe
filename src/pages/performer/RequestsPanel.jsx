import { useEffect, useMemo, useState } from 'react'
import { CircleAlert, MapPin, MessageSquareText } from 'lucide-react'
import { getMyServices } from '../../api/performer'
import { getPerformerRequests, saveOffer, withdrawOffer } from '../../api/requests'
import { useToast } from '../../context/ToastContext'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Modal from '../../components/common/Modal'
import Select from '../../components/common/Select'
import VerificationLimitNotice from '../../components/performer/VerificationLimitNotice'
import { useVerificationLimits } from '../../utils/useVerificationLimits'
import '../../components/common/Features.css'

const STATUS = { Open: 'Открыт', Chosen: 'Мастер выбран', Cancelled: 'Отменён' }
const OFFER = { Pending: 'Ждёт выбора клиента', Accepted: 'Ваше предложение выбрано', Rejected: 'Клиент выбрал другого', Withdrawn: 'Отозвано' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDesired(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}

function OfferModal({ request, services, onClose, onSaved }) {
  const guard = useAuthGuard()
  const mine = request.myOffer && request.myOffer.status === 'Pending' ? request.myOffer : null
  // сначала услуги из той же категории, что и запрос
  const sorted = useMemo(
    () => [...services].sort((a, b) => Number(b.categoryId === request.categoryId) - Number(a.categoryId === request.categoryId)),
    [services, request.categoryId],
  )
  const [serviceId, setServiceId] = useState(mine?.serviceId ?? sorted[0]?.id ?? '')
  const [price, setPrice] = useState(mine ? String(mine.price) : '')
  const [message, setMessage] = useState(mine?.message ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const value = Number(String(price).replace(',', '.'))
    if (!serviceId) return setError('Выберите одну из своих услуг')
    if (!(value > 0)) return setError('Укажите цену больше нуля')
    setBusy(true)
    try {
      onSaved(await saveOffer(request.id, { serviceId: Number(serviceId), price: value, message: message.trim() }))
    } catch (err) {
      if (!guard(err)) {
        setError((err?.errors ? Object.values(err.errors).flat()[0] : err?.error) ?? 'Не удалось отправить предложение')
      }
      setBusy(false)
    }
  }

  return (
    <Modal title={mine ? 'Изменить предложение' : 'Предложить цену'} onClose={() => !busy && onClose()}>
      <form className="rq-form" onSubmit={submit} noValidate>
        <div className="rq-mine"><b>{request.title}</b><br />{request.description}</div>
        {services.length === 0 ? (
          <div className="form-alert" role="alert"><CircleAlert size={18} /><span>Сначала добавьте активную услугу в разделе «Мои услуги»</span></div>
        ) : (
          <div className="reason-field">
            <span className="field-label">Услуга</span>
            <Select value={serviceId} onChange={setServiceId} ariaLabel="Услуга"
              options={sorted.map((s) => ({ value: String(s.id), label: s.title }))} />
          </div>
        )}
        <Input id="offer-price" label="Ваша цена, BYN" type="number" min="0" step="0.01" placeholder="50"
          value={price} onChange={(e) => { setPrice(e.target.value); setError('') }} />
        <label className="reason-field">
          <span className="field-label">Сообщение клиенту (необязательно)</span>
          <textarea className="sp-comment" rows={3} maxLength={1000} value={message}
            placeholder="Что входит в цену, когда сможете приехать"
            onChange={(e) => setMessage(e.target.value)} />
        </label>
        {error && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button type="submit" loading={busy} disabled={services.length === 0}>Отправить</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function RequestsPanel() {
  const guard = useAuthGuard()
  const { show } = useToast()
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [services, setServices] = useState([])
  const [target, setTarget] = useState(null)
  const verification = useVerificationLimits()
  const canOffer = verification?.limits.canSendOffers !== false

  useEffect(() => {
    let cancelled = false
    Promise.all([getPerformerRequests(), getMyServices().catch(() => [])])
      .then(([items, svc]) => {
        if (cancelled) return
        setServices(svc.filter((s) => s.isActive))
        setState({ status: 'ready', items, error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить запросы' })
      })
    return () => { cancelled = true }
  }, [guard])

  function patch(id, changes) {
    setState((s) => ({ ...s, items: s.items.map((r) => (r.id === id ? { ...r, ...changes } : r)) }))
  }

  function saved(offer) {
    const had = target.myOffer && target.myOffer.status === 'Pending'
    patch(target.id, { myOffer: offer, offersCount: had ? target.offersCount : target.offersCount + 1 })
    setTarget(null)
    show('Предложение отправлено клиенту')
  }

  async function withdraw(request) {
    try {
      await withdrawOffer(request.id)
      patch(request.id, { myOffer: { ...request.myOffer, status: 'Withdrawn' }, offersCount: Math.max(0, request.offersCount - 1) })
      show('Предложение отозвано')
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось отозвать предложение', 'error')
    }
  }

  const { items } = state

  return (
    <section className="pf-panel">
      <h2>Запросы клиентов</h2>
      <p className="pf-panel-lead">Клиенты описывают задачу, вы предлагаете свою цену, клиент выбирает мастера.</p>

      {!canOffer && (
        <VerificationLimitNotice>
          Пока профиль не проверен, вы видите запросы клиентов, но не можете предлагать цену.
        </VerificationLimitNotice>
      )}

      {state.status === 'loading' && <div aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton pf-sk-row" />)}</div>}
      {state.status === 'error' && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>}
      {state.status === 'ready' && items.length === 0 && (
        <div className="empty">
          <MessageSquareText size={42} strokeWidth={1.5} />
          <h3>Запросов пока нет</h3>
          <p>Здесь появятся запросы клиентов в категориях ваших услуг</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="rq-list">
          {items.map((r) => {
            const offer = r.myOffer
            const active = offer && offer.status !== 'Withdrawn'
            return (
              <li key={r.id} className="rq-card">
                <div className="rq-top">
                  <h3 className="rq-title">{r.title}</h3>
                  <span className={`rq-status ${r.status}`}>{STATUS[r.status] ?? r.status}</span>
                </div>
                <div className="rq-meta">
                  <span>{r.categoryName}</span>
                  <span>{formatDate(r.createdAt)}</span>
                  {r.desiredDate && <span>Желаемая дата: {formatDesired(r.desiredDate)}</span>}
                  <span>Предложений: {r.offersCount}</span>
                </div>
                <p className="rq-desc">{r.description}</p>
                {r.address && (
                  <div className="rq-meta">
                    <span><MapPin size={13} /> {r.address}</span>
                    {r.contactName && <span>{r.contactName}</span>}
                    {r.contactPhone && <span>{r.contactPhone}</span>}
                  </div>
                )}
                {active && (
                  <div className="rq-mine">
                    <b>Ваше предложение: {offer.price} BYN</b> ({offer.serviceTitle}) — {OFFER[offer.status] ?? offer.status}
                    {offer.message && <div>{offer.message}</div>}
                  </div>
                )}
                {r.status === 'Open' && (
                  <div className="rq-actions">
                    <Button onClick={() => setTarget(r)} disabled={!canOffer}>{active && offer.status === 'Pending' ? 'Изменить предложение' : 'Предложить цену'}</Button>
                    {active && offer.status === 'Pending' && (
                      <button type="button" className="rv-link danger" onClick={() => withdraw(r)}>Отозвать</button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {target && <OfferModal request={target} services={services} onClose={() => setTarget(null)} onSaved={saved} />}
    </section>
  )
}
