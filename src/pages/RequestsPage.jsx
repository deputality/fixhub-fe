import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, CircleAlert, MapPin, MessageSquareText, Phone, Plus, Star, User } from 'lucide-react'
import { getCategories } from '../api/catalog'
import { acceptOffer, cancelRequest, createRequest, getMyRequests, getRequest } from '../api/requests'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import { validateContact } from '../utils/contactForm'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import '../components/Features.css'
import './OrdersPage.css'

const STATUS = { Open: 'Открыт', Chosen: 'Мастер выбран', Cancelled: 'Отменён' }
const OFFER_STATUS = { Accepted: 'Выбрано', Rejected: 'Не выбрано', Withdrawn: 'Отозвано' }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}
function formatDesired(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}.${m}.${y}`
}
function todayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function NewRequestModal({ categories, onClose, onCreated }) {
  const { user } = useAuth()
  const guard = useAuthGuard()
  const roots = categories.filter((c) => !c.parentId)
  const childrenOf = (id) => categories.filter((c) => c.parentId === id)

  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [name, setName] = useState(user?.fullName ?? '')
  const [date, setDate] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  function bind(setter, key) {
    return (e) => {
      setter(e.target.value)
      setFormError('')
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  async function submit(e) {
    e.preventDefault()
    const found = validateContact({ name, address, phone })
    if (!categoryId) found.category = 'Выберите категорию'
    if (title.trim().length < 3) found.title = 'Коротко опишите задачу (от 3 символов)'
    if (!description.trim()) found.description = 'Опишите, что нужно сделать'
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    try {
      onCreated(await createRequest({
        categoryId: Number(categoryId),
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        contactName: name.trim(),
        contactPhone: phone.trim(),
        desiredDate: date || null,
      }))
    } catch (err) {
      if (!guard(err)) {
        setFormError((err?.errors ? Object.values(err.errors).flat()[0] : err?.error) ?? 'Не удалось создать запрос')
      }
      setBusy(false)
    }
  }

  return (
    <Modal title="Новый запрос цены" size="lg" onClose={() => !busy && onClose()}>
      <form className="rq-form" onSubmit={submit} noValidate>
        <label className="reason-field">
          <span className="field-label">Категория</span>
          <select value={categoryId} onChange={bind(setCategoryId, 'category')}>
            <option value="">Выберите категорию</option>
            {roots.map((root) => {
              const kids = childrenOf(root.id)
              return kids.length === 0
                ? <option key={root.id} value={root.id}>{root.name}</option>
                : (
                  <optgroup key={root.id} label={root.name}>
                    {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </optgroup>
                )
            })}
          </select>
          {errors.category && <span className="field-error" role="alert"><CircleAlert size={15} />{errors.category}</span>}
        </label>
        <Input id="rq-title" label="Что нужно сделать" placeholder="Например: заменить смеситель на кухне" maxLength={200}
          value={title} onChange={bind(setTitle, 'title')} error={errors.title} />
        <label className="reason-field">
          <span className="field-label">Подробности</span>
          <textarea className="sp-comment" rows={4} maxLength={4000} value={description}
            placeholder="Размеры, материалы, пожелания по срокам"
            onChange={bind(setDescription, 'description')} />
          {errors.description && <span className="field-error" role="alert"><CircleAlert size={15} />{errors.description}</span>}
        </label>
        <Input id="rq-address" label="Адрес" icon={<MapPin size={20} />} placeholder="Ул. Ленина, д.10, кв.25" maxLength={300}
          value={address} onChange={bind(setAddress, 'address')} error={errors.address} />
        <Input id="rq-phone" type="tel" label="Телефон" icon={<Phone size={20} />} placeholder="+375 (29) 857-17-12" maxLength={25}
          value={phone} onChange={bind(setPhone, 'phone')} error={errors.phone} />
        <Input id="rq-name" label="Имя" icon={<User size={20} />} placeholder="Иван Петров" maxLength={200}
          value={name} onChange={bind(setName, 'name')} error={errors.name} />
        <label className="reason-field">
          <span className="field-label">Желаемая дата (необязательно)</span>
          <input type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        {formError && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button type="submit" loading={busy}>Отправить запрос</Button>
        </div>
      </form>
    </Modal>
  )
}

function Offers({ requestId, request, onAccepted }) {
  const guard = useAuthGuard()
  const { show } = useToast()
  const [state, setState] = useState({ status: 'loading', offers: [], error: '' })
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    let cancelled = false
    getRequest(requestId)
      .then((d) => { if (!cancelled) setState({ status: 'ready', offers: d.offers ?? [], error: '' }) })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', offers: [], error: err?.error ?? 'Не удалось загрузить предложения' })
      })
    return () => { cancelled = true }
  }, [requestId, guard])

  async function accept(offer) {
    setBusyId(offer.id)
    try {
      const res = await acceptOffer(requestId, offer.id)
      show('Мастер выбран, заказ создан')
      onAccepted(res)
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось выбрать предложение', 'error')
      setBusyId(null)
    }
  }

  if (state.status === 'loading') return <div className="skeleton pf-sk-row" aria-hidden="true" />
  if (state.status === 'error') return <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>
  const offers = state.offers.filter((o) => o.status !== 'Withdrawn')
  if (offers.length === 0) return <p className="rq-offer-sub">Предложений пока нет. Мастера увидят запрос и пришлют цену.</p>

  return (
    <ul className="rq-offers">
      {offers.map((o) => (
        <li key={o.id} className={`rq-offer ${o.status}`}>
          <div>
            <div className="rq-offer-name">
              <Link to={`/performers/${o.performerId}`}>{o.performerName}</Link>
              {o.performerIsVerified && <BadgeCheck size={16} style={{ marginLeft: 6, verticalAlign: '-3px' }} aria-label="Проверенный мастер" />}
            </div>
            <div className="rq-offer-sub">
              {o.serviceTitle}
              {o.performerRating != null && <> · <Star size={12} fill="#f59e0b" stroke="#f59e0b" /> {Number(o.performerRating).toFixed(1)}</>}
            </div>
          </div>
          <div className="rq-offer-side">
            <div className="rq-offer-price">{o.price} BYN</div>
            {request.status === 'Open' && o.status === 'Pending' && (
              <Button loading={busyId === o.id} disabled={busyId !== null} onClick={() => accept(o)}>Выбрать</Button>
            )}
            {OFFER_STATUS[o.status] && <span className="rq-offer-sub">{OFFER_STATUS[o.status]}</span>}
          </div>
          {o.message && <p className="rq-offer-msg">{o.message}</p>}
        </li>
      ))}
    </ul>
  )
}

export default function RequestsPage() {
  const guard = useAuthGuard()
  const { show } = useToast()
  const navigate = useNavigate()
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [categories, setCategories] = useState([])
  const [creating, setCreating] = useState(false)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyRequests(), getCategories().catch(() => [])])
      .then(([items, cats]) => {
        if (cancelled) return
        setCategories(cats)
        setState({ status: 'ready', items, error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить запросы' })
      })
    return () => { cancelled = true }
  }, [guard])

  const patch = useCallback((id, changes) => {
    setState((s) => ({ ...s, items: s.items.map((r) => (r.id === id ? { ...r, ...changes } : r)) }))
  }, [])

  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories])

  async function cancel(request) {
    try {
      patch(request.id, await cancelRequest(request.id))
      show('Запрос отменён')
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось отменить запрос', 'error')
    }
  }

  function created(request) {
    setState((s) => ({ ...s, items: [request, ...s.items] }))
    setCreating(false)
    setOpenId(request.id)
    show('Запрос отправлен мастерам')
  }

  function accepted(res) {
    patch(res.request.id, res.request)
    navigate('/orders')
  }

  const { items } = state

  return (
    <div className="ord-page">
      <div className="rq-head">
        <div>
          <h1>Запросы цены</h1>
          <p className="ord-lead">
            Опишите задачу, мастера пришлют свою цену, а вы выберете подходящее предложение.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}><Plus size={18} /> Новый запрос</Button>
      </div>

      {state.status === 'loading' && <div aria-hidden="true">{[0, 1].map((i) => <div key={i} className="skeleton pf-sk-row" />)}</div>}
      {state.status === 'error' && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>}
      {state.status === 'ready' && items.length === 0 && (
        <div className="empty">
          <MessageSquareText size={46} strokeWidth={1.5} />
          <h3>Запросов пока нет</h3>
          <p>Создайте запрос, и мастера пришлют вам цену</p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="rq-list">
          {items.map((r) => (
            <li key={r.id} className="rq-card">
              <div className="rq-top">
                <h3 className="rq-title">{r.title}</h3>
                <span className={`rq-status ${r.status}`}>{STATUS[r.status] ?? r.status}</span>
              </div>
              <div className="rq-meta">
                <span>{r.categoryName ?? catName[r.categoryId]}</span>
                <span>{formatDate(r.createdAt)}</span>
                {r.desiredDate && <span>Желаемая дата: {formatDesired(r.desiredDate)}</span>}
                <span>Предложений: {r.offersCount}</span>
              </div>
              <p className="rq-desc">{r.description}</p>
              <div className="rq-actions">
                <Button variant="outline" onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                  {openId === r.id ? 'Скрыть предложения' : `Предложения (${r.offersCount})`}
                </Button>
                {r.status === 'Open' && (
                  <button type="button" className="rv-link danger" onClick={() => cancel(r)}>Отменить запрос</button>
                )}
                {r.status === 'Chosen' && <Link to="/orders" className="rv-link">Перейти к заказу</Link>}
              </div>
              {openId === r.id && <Offers requestId={r.id} request={r} onAccepted={accepted} />}
            </li>
          ))}
        </ul>
      )}

      {creating && <NewRequestModal categories={categories} onClose={() => setCreating(false)} onCreated={created} />}
    </div>
  )
}
