import { useState } from 'react'
import { CircleAlert, Flag } from 'lucide-react'
import { sendComplaint } from '../api/complaints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Modal from './Modal'
import Select from './Select'
import './Complaint.css'

const REASONS = {
  Review: [
    { value: 'fake', label: 'Фальшивый отзыв' },
    { value: 'abuse', label: 'Оскорбления или грубость' },
    { value: 'spam', label: 'Спам или реклама' },
    { value: 'other', label: 'Другое' },
  ],
  Performer: [
    { value: 'fraud', label: 'Мошенничество' },
    { value: 'abuse', label: 'Грубость или оскорбления' },
    { value: 'fake', label: 'Ложные данные в профиле' },
    { value: 'spam', label: 'Спам или реклама' },
    { value: 'other', label: 'Другое' },
  ],
}

const TITLES = { Review: 'Пожаловаться на отзыв', Performer: 'Пожаловаться на мастера' }

function ComplaintModal({ kind, targetId, onClose }) {
  const { show } = useToast()
  const [reason, setReason] = useState(REASONS[kind][0].value)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (reason === 'other' && !comment.trim()) {
      setError('Опишите, что случилось')
      return
    }
    setBusy(true)
    setError('')
    try {
      await sendComplaint({ kind, targetId, reason, comment: comment.trim() || null })
      show('Жалоба отправлена. Мы её рассмотрим')
      onClose()
    } catch (err) {
      setError(err?.error ?? 'Не удалось отправить жалобу')
      setBusy(false)
    }
  }

  return (
    <Modal title={TITLES[kind]} onClose={onClose}>
      <form className="cmp-form" onSubmit={submit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="cmp-reason">Причина</label>
          <Select id="cmp-reason" value={reason} onChange={setReason} options={REASONS[kind]} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="cmp-comment">
            Подробности{reason === 'other' ? '' : ' (необязательно)'}
          </label>
          <textarea
            id="cmp-comment"
            className="cmp-text"
            rows={4}
            maxLength={1000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Что именно не так?"
          />
        </div>

        {error && <div className="form-alert" role="alert"><CircleAlert size={18} />{error}</div>}

        <p className="cmp-hint">Жалобу увидит только администратор. Мастер и автор отзыва не узнают, кто пожаловался.</p>

        <div className="modal-actions">
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Отмена</button>
          <button type="submit" className="btn btn-sm" disabled={busy}>{busy ? 'Отправляем...' : 'Отправить'}</button>
        </div>
      </form>
    </Modal>
  )
}

// kind: 'Review' | 'Performer'; ownerId: чья это страница или отзыв, на себя жаловаться нельзя.
// Гостям и администраторам кнопка не показывается.
export default function ComplaintButton({ kind, targetId, ownerId, label = 'Пожаловаться', className = '' }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user || user.role === 'Admin' || (ownerId != null && ownerId === user.id)) return null

  return (
    <>
      <button type="button" className={`cmp-link ${className}`} onClick={() => setOpen(true)}>
        <Flag size={14} /> {label}
      </button>
      {open && <ComplaintModal kind={kind} targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  )
}
