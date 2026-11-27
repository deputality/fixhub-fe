import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, CircleCheck, CircleX, Star } from 'lucide-react'
import { getAdminComplaints, rejectComplaint, resolveComplaint } from '../../api/admin'
import { useToast } from '../../context/ToastContext'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import '../../components/feedback/Complaint.css'
import './AdminPage.css'
import './AdminSections.css'

const PAGE_SIZE = 6

const FILTERS = [
  { value: 'New', label: 'Новые' },
  { value: '', label: 'Все' },
  { value: 'Resolved', label: 'Принятые' },
  { value: 'Rejected', label: 'Отклонённые' },
]

const REASONS = {
  spam: 'Спам или реклама',
  abuse: 'Оскорбления или грубость',
  fake: 'Ложная информация',
  fraud: 'Мошенничество',
  other: 'Другое',
}

const STATUS = {
  New: { label: 'Новая', cls: 'adm-st-attention' },
  Resolved: { label: 'Принята', cls: 'adm-st-active' },
  Rejected: { label: 'Отклонена', cls: 'adm-st-blocked' },
}

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

// Окно решения: принять (с побочными действиями) или отклонить
function DecisionModal({ complaint, mode, busy, onConfirm, onClose }) {
  const isReview = complaint.kind === 'Review'
  const [note, setNote] = useState('')
  const [hideReview, setHideReview] = useState(isReview && !complaint.reviewIsHidden)
  const [blockPerformer, setBlockPerformer] = useState(false)

  const accept = mode === 'resolve'

  return (
    <Modal title={accept ? 'Принять жалобу' : 'Отклонить жалобу'} onClose={onClose}>
      <div className="cmp-form">
        <p className="as-decide-text">
          {accept
            ? 'Нарушение подтверждено. Выберите, что сделать, и при желании оставьте заметку для журнала.'
            : 'Нарушения не найдено. Жалоба будет закрыта, на сайте ничего не изменится.'}
        </p>

        {accept && isReview && !complaint.reviewIsHidden && (
          <label className="as-check">
            <input type="checkbox" checked={hideReview} onChange={(e) => setHideReview(e.target.checked)} />
            <span><b>Скрыть отзыв</b>Он пропадёт с сайта и не будет учитываться в рейтинге</span>
          </label>
        )}
        {accept && complaint.performerId && !complaint.performerIsBlocked && (
          <label className="as-check">
            <input type="checkbox" checked={blockPerformer} onChange={(e) => setBlockPerformer(e.target.checked)} />
            <span><b>Заблокировать мастера</b>{complaint.performerName} не сможет войти, а его услуги исчезнут из каталога</span>
          </label>
        )}

        <div className="field">
          <label className="field-label" htmlFor="decide-note">Заметка (необязательно)</label>
          <textarea
            id="decide-note"
            className="cmp-text"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: подтвердили скриншотом"
          />
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Отмена</button>
          <button
            type="button"
            className="btn btn-sm"
            disabled={busy}
            onClick={() => onConfirm({ note: note.trim() || null, hideReview: accept && hideReview, blockPerformer: accept && blockPerformer })}
          >
            {accept ? 'Принять' : 'Отклонить'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default function AdminComplaints() {
  const onAuthError = useAuthGuard()
  const { show } = useToast()
  const [filter, setFilter] = useState('New')
  const [page, setPage] = useState(1)
  const [reload, setReload] = useState(0)
  const [decision, setDecision] = useState(null)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState({ key: null, items: [], total: 0, totalPages: 0, error: '' })

  const key = `${filter}|${page}|${reload}`

  useEffect(() => {
    let cancelled = false
    getAdminComplaints({ status: filter, page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return
        setData({ key, items: res.items, total: res.totalCount, totalPages: res.totalPages, error: '' })
      })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setData({ key, items: [], total: 0, totalPages: 0, error: err?.error ?? 'Не удалось загрузить жалобы' })
      })
    return () => { cancelled = true }
  }, [key, filter, page, onAuthError])

  const loading = data.key !== key

  function changeFilter(value) {
    setFilter(value)
    setPage(1)
  }

  async function confirm(body) {
    setBusy(true)
    try {
      const { complaint, mode } = decision
      if (mode === 'resolve') await resolveComplaint(complaint.id, body)
      else await rejectComplaint(complaint.id, { note: body.note })
      show(mode === 'resolve' ? 'Жалоба принята' : 'Жалоба отклонена')
      setDecision(null)
      if (data.items.length === 1 && page > 1) setPage(page - 1)
      else setReload((r) => r + 1)
    } catch (err) {
      if (!onAuthError(err)) show(err?.error ?? 'Не удалось выполнить действие', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Жалобы</h1>
        <p>Жалобы клиентов и мастеров на отзывы и профили. Примите жалобу, если нарушение есть, или отклоните.</p>
      </header>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <h2>Список жалоб</h2>
          <div className="as-filter">
            <Select value={filter} onChange={changeFilter} options={FILTERS} ariaLabel="Фильтр жалоб" />
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
          <div className={`as-complaints${loading ? ' is-loading' : ''}`}>
            {data.items.map((c) => {
              const status = STATUS[c.status] ?? STATUS.New
              return (
                <article key={c.id} className="as-complaint">
                  <header className="as-complaint-head">
                    <span className="adm-pill adm-st-verified">{c.kind === 'Review' ? 'На отзыв' : 'На мастера'}</span>
                    <b>{REASONS[c.reason] ?? c.reason}</b>
                    <span className="as-complaint-date">№{c.id} · {formatDateTime(c.createdAt)}</span>
                    <span className={`adm-pill ${status.cls}`}>{status.label}</span>
                  </header>

                  <p className="as-complaint-from">
                    <span>От: {c.reporterName}</span>
                    {c.comment ? <q>{c.comment}</q> : <i>Без пояснения</i>}
                  </p>

                  <div className="as-target-box">
                    {c.kind === 'Review' && (
                      <>
                        <div className="as-target-top">
                          <Stars value={c.reviewRating ?? 0} />
                          {c.reviewIsHidden && <span className="adm-pill adm-st-blocked">Отзыв скрыт</span>}
                        </div>
                        <p>{c.reviewText ?? 'Отзыв удалён'}</p>
                      </>
                    )}
                    <div className="as-target-top">
                      <span>Мастер: <Link to={`/performers/${c.performerId}`} target="_blank" rel="noreferrer">{c.performerName}</Link></span>
                      {c.performerIsBlocked && <span className="adm-pill adm-st-blocked">Заблокирован</span>}
                    </div>
                  </div>

                  {c.status === 'New' ? (
                    <div className="as-complaint-actions">
                      <button type="button" className="adm-act-btn verify" onClick={() => setDecision({ complaint: c, mode: 'resolve' })}>
                        <CircleCheck size={15} /> Принять
                      </button>
                      <button type="button" className="adm-act-btn unverify" onClick={() => setDecision({ complaint: c, mode: 'reject' })}>
                        <CircleX size={15} /> Отклонить
                      </button>
                    </div>
                  ) : (
                    <p className="as-complaint-result">
                      Рассмотрена {c.resolvedAt ? formatDateTime(c.resolvedAt) : ''}{c.resolution ? `: ${c.resolution}` : ''}
                    </p>
                  )}
                </article>
              )
            })}

            {!loading && data.items.length === 0 && (
              <p className="as-complaints-empty">
                {filter === 'New' ? 'Новых жалоб нет. Всё рассмотрено.' : 'Жалоб не найдено.'}
              </p>
            )}
            {data.key === null && Array.from({ length: 3 }, (_, i) => <div key={i} className="adm-skel as-complaint-skel" />)}
          </div>
        )}

        <div className="adm-panel-foot">
          <span>Всего жалоб: <b>{data.total.toLocaleString('ru-RU')}</b></span>
          <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
        </div>
      </section>

      {decision && (
        <DecisionModal
          complaint={decision.complaint}
          mode={decision.mode}
          busy={busy}
          onConfirm={confirm}
          onClose={() => setDecision(null)}
        />
      )}
    </div>
  )
}
