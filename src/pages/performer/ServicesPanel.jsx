import { useEffect, useMemo, useState } from 'react'
import { Briefcase, CircleAlert, Eye, EyeOff, Pencil, Plus } from 'lucide-react'
import { hideService, getMyServices, showService } from '../../api/performer'
import { getCategories } from '../../api/catalog'
import { useToast } from '../../context/ToastContext'
import { resolveCategoryMeta } from '../../utils/categoryMeta'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Button from '../../components/common/Button'
import ServiceFormModal from '../../components/performer/ServiceFormModal'
import VerificationLimitNotice from '../../components/performer/VerificationLimitNotice'
import { useVerificationLimits } from '../../utils/useVerificationLimits'

const UNITS = { Hour: 'час', Piece: 'шт.' }

// createRequest: число, которое растёт при нажатии «Добавить услугу» снаружи
// hideAdd: спрятать собственную кнопку, если кнопка уже есть на странице
export default function ServicesPanel({ createRequest = 0, hideAdd = false }) {
  const { show } = useToast()
  const guard = useAuthGuard()

  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [manualCreate, setManualCreate] = useState(false)
  const [closedAt, setClosedAt] = useState(0)
  const [busyId, setBusyId] = useState(null)
  const verification = useVerificationLimits()

  useEffect(() => {
    let cancelled = false
    Promise.all([getMyServices(), getCategories().catch(() => [])])
      .then(([items, cats]) => {
        if (cancelled) return
        setCategories(cats)
        setState({ status: 'ready', items, error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить услуги' })
      })
    return () => { cancelled = true }
  }, [guard])

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const maxServices = verification?.limits.maxServices ?? null
  const atLimit = maxServices !== null && state.items.length >= maxServices
  const creating = !atLimit && (manualCreate || createRequest > closedAt)
  const formOpen = creating || editing !== null

  // кнопка «Добавить услугу» снаружи: при лимите вместо формы говорим, почему нельзя
  useEffect(() => {
    if (atLimit && createRequest > closedAt) {
      show(`Непроверенный мастер может опубликовать не больше ${maxServices} услуг`, 'error')
      setClosedAt(createRequest)
    }
  }, [atLimit, createRequest, closedAt, maxServices, show])

  function closeForm() {
    setManualCreate(false)
    setClosedAt(createRequest)
    setEditing(null)
  }

  function onSaved(saved, isNew) {
    setState((s) => ({
      ...s,
      items: isNew ? [saved, ...s.items] : s.items.map((i) => (i.id === saved.id ? saved : i)),
    }))
    show(isNew ? 'Услуга добавлена' : 'Изменения сохранены')
    closeForm()
  }

  async function toggle(item) {
    setBusyId(item.id)
    try {
      const updated = await (item.isActive ? hideService(item.id) : showService(item.id))
      setState((s) => ({ ...s, items: s.items.map((i) => (i.id === item.id ? updated : i)) }))
      show(updated.isActive ? 'Услуга снова в каталоге' : 'Услуга скрыта из каталога')
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось изменить видимость услуги', 'error')
    } finally {
      setBusyId(null)
    }
  }

  const { items } = state

  return (
    <section className="pf-panel">
      <div className="pf-panel-top">
        <div>
          <h2>Мои услуги</h2>
          <p className="pf-panel-lead">Услуги, которые клиенты видят в каталоге. Скрытые услуги в каталоге не показываются.</p>
        </div>
        {!hideAdd && (
          <Button onClick={() => setManualCreate(true)} disabled={atLimit}
            title={atLimit ? `Не больше ${maxServices} услуг, пока профиль не проверен` : undefined}>
            <Plus size={18} /> Добавить услугу
          </Button>
        )}
      </div>

      {verification && !verification.isVerified && maxServices !== null && (
        <VerificationLimitNotice>
          Профиль не проверен: можно добавить не больше {maxServices} услуг (сейчас {state.items.length}).
        </VerificationLimitNotice>
      )}

      {state.status === 'loading' && (
        <div aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton pf-sk-row" />)}</div>
      )}

      {state.status === 'error' && (
        <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>
      )}

      {state.status === 'ready' && items.length === 0 && (
        <div className="empty">
          <Briefcase size={42} strokeWidth={1.5} />
          <h3>У вас пока нет услуг</h3>
          <p>Добавьте первую услугу, чтобы клиенты могли её заказать</p>
        </div>
      )}

      {state.status === 'ready' && items.length > 0 && (
        <ul className="pf-services">
          {items.map((item) => {
            const meta = resolveCategoryMeta(item.categoryId, byId)
            const Icon = meta.icon
            const src = item.photoUrl || meta.image
            return (
              <li key={item.id} className={`pf-service${item.isActive ? '' : ' off'}`}>
                <span className="pf-service-photo" style={{ '--cat': meta.color }}>
                  {src ? <img src={src} alt="" loading="lazy" /> : <Icon size={28} strokeWidth={1.6} />}
                </span>
                <div className="pf-service-info">
                  <div className="pf-service-title">{item.title}</div>
                  <div className="pf-service-meta">
                    <span className="pf-tag" style={{ '--c': meta.color }}>{item.categoryName}</span>
                    <span className={`pf-visible ${item.isActive ? 'on' : 'off'}`}>
                      {item.isActive ? 'Опубликована' : 'Скрыта'}
                    </span>
                  </div>
                </div>
                <div className="pf-service-price">
                  от {item.price} BYN<small>/{UNITS[item.unit] ?? ''}</small>
                </div>
                <div className="pf-service-actions">
                  <button type="button" className="pf-icon-btn" onClick={() => setEditing(item)} aria-label="Редактировать">
                    <Pencil size={18} />
                  </button>
                  <button type="button" className="pf-icon-btn" disabled={busyId === item.id} onClick={() => toggle(item)}
                    aria-label={item.isActive ? 'Скрыть из каталога' : 'Показать в каталоге'}
                    title={item.isActive ? 'Скрыть из каталога' : 'Показать в каталоге'}>
                    {item.isActive ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {formOpen && (
        <ServiceFormModal service={editing} categories={categories} onClose={closeForm} onSaved={onSaved} />
      )}
    </section>
  )
}
