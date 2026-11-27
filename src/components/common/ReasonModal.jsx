import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Button from './Button'
import Modal from './Modal'
import './Features.css'

const MIN = 3
const MAX = 500

// Окно с обязательной причиной (отмена и отклонение заказа).
// onConfirm(reason) возвращает промис; пока он выполняется, окно закрыть нельзя
export default function ReasonModal({ title, text, presets = [], confirmLabel, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const value = reason.trim()
    if (value.length < MIN) return setError(`Укажите причину (не короче ${MIN} символов)`)
    setBusy(true)
    try {
      await onConfirm(value)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <form className="reason-form" onSubmit={submit} noValidate>
        {text && <p className="modal-text">{text}</p>}
        {presets.length > 0 && (
          <div className="reason-presets">
            {presets.map((p) => (
              <button key={p} type="button" className="reason-chip" onClick={() => { setReason(p); setError('') }}>{p}</button>
            ))}
          </div>
        )}
        <label className="reason-field">
          <span className="field-label">Причина (обязательно)</span>
          <textarea
            className="sp-comment"
            rows={3}
            maxLength={MAX}
            placeholder="Опишите причину"
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError('') }}
            autoFocus
          />
        </label>
        {error && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Назад</Button>
          <Button type="submit" variant="danger" loading={busy}>{confirmLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
