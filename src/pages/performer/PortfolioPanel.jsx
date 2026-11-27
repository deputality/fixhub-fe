import { useEffect, useState } from 'react'
import { CircleAlert, Images, Pencil, Plus, Trash2 } from 'lucide-react'
import { deletePortfolioItem, getMyPortfolio } from '../../api/portfolio'
import { useToast } from '../../context/ToastContext'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PortfolioFormModal from '../../components/performer/PortfolioFormModal'
import VerificationLimitNotice from '../../components/performer/VerificationLimitNotice'
import { useVerificationLimits } from '../../utils/useVerificationLimits'

// запасное значение, пока сервер не сообщил настоящий лимит
const DEFAULT_MAX_ITEMS = 30

export default function PortfolioPanel() {
  const { show } = useToast()
  const guard = useAuthGuard()
  const verification = useVerificationLimits()

  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  // form: false (закрыто) | null (новая работа) | объект (редактирование)
  const [form, setForm] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [removeBusy, setRemoveBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getMyPortfolio()
      .then((items) => { if (!cancelled) setState({ status: 'ready', items, error: '' }) })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить портфолио' })
      })
    return () => { cancelled = true }
  }, [guard])

  function onSaved(saved, isNew) {
    setState((s) => ({
      ...s,
      items: isNew ? [saved, ...s.items] : s.items.map((i) => (i.id === saved.id ? saved : i)),
    }))
    show(isNew ? 'Работа добавлена в портфолио' : 'Изменения сохранены')
    setForm(false)
  }

  async function confirmRemove() {
    setRemoveBusy(true)
    try {
      await deletePortfolioItem(removing.id)
      setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== removing.id) }))
      show('Работа удалена')
      setRemoving(null)
    } catch (err) {
      if (!guard(err)) show(err?.error ?? 'Не удалось удалить работу', 'error')
    } finally {
      setRemoveBusy(false)
    }
  }

  const { items } = state
  const maxItems = verification?.limits.maxPortfolioItems ?? DEFAULT_MAX_ITEMS
  const full = items.length >= maxItems

  return (
    <section className="pf-panel">
      <div className="pf-panel-top">
        <div>
          <h2>Портфолио</h2>
          <p className="pf-panel-lead">
            Покажите результат своих работ: фото «до» и «после» помогают клиенту выбрать именно вас.
            Работы видны на вашей публичной странице.
          </p>
        </div>
        <Button onClick={() => setForm(null)} disabled={full} title={full ? `Не больше ${maxItems} работ` : undefined}>
          <Plus size={18} /> Добавить работу
        </Button>
      </div>

      {verification && !verification.isVerified && (
        <VerificationLimitNotice>
          Профиль не проверен: в портфолио можно добавить не больше {maxItems} работ (сейчас {items.length}).
        </VerificationLimitNotice>
      )}

      {state.status === 'loading' && (
        <div aria-hidden="true">{[0, 1].map((i) => <div key={i} className="skeleton pf-sk-row" />)}</div>
      )}

      {state.status === 'error' && (
        <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>
      )}

      {state.status === 'ready' && items.length === 0 && (
        <div className="empty">
          <Images size={42} strokeWidth={1.5} />
          <h3>В портфолио пока нет работ</h3>
          <p>Добавьте первую работу: достаточно одного фото результата, фото «до» можно приложить по желанию</p>
        </div>
      )}

      {state.status === 'ready' && items.length > 0 && (
        <ul className="pw-list">
          {items.map((item) => (
            <li key={item.id} className="pw-row">
              <span className="pw-thumbs">
                {item.beforeUrl && <img src={item.beforeUrl} alt="До" loading="lazy" />}
                <img src={item.afterUrl} alt={item.beforeUrl ? 'После' : 'Результат'} loading="lazy" />
              </span>
              <div className="pw-info">
                <div className="pw-title">{item.title}</div>
                {item.description && <div className="pw-desc">{item.description}</div>}
                {item.photoUrls?.length > 0 && <div className="pw-desc">Ещё фото: {item.photoUrls.length}</div>}
              </div>
              <div className="pf-service-actions">
                <button type="button" className="pf-icon-btn" onClick={() => setForm(item)} aria-label="Редактировать" title="Редактировать">
                  <Pencil size={18} />
                </button>
                <button type="button" className="pf-icon-btn" onClick={() => setRemoving(item)} aria-label="Удалить" title="Удалить">
                  <Trash2 size={18} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form !== false && (
        <PortfolioFormModal item={form} onClose={() => setForm(false)} onSaved={onSaved} />
      )}

      {removing && (
        <Modal title="Удалить работу?" onClose={() => !removeBusy && setRemoving(null)}>
          <p className="pw-confirm">«{removing.title}» пропадёт из вашего портфолио. Это действие нельзя отменить.</p>
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setRemoving(null)} disabled={removeBusy}>Отмена</Button>
            <Button onClick={confirmRemove} loading={removeBusy}>Удалить</Button>
          </div>
        </Modal>
      )}
    </section>
  )
}
