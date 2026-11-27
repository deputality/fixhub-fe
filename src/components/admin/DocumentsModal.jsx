import { useEffect, useState } from 'react'
import { CircleAlert, ExternalLink, FileText, ShieldCheck, ShieldOff } from 'lucide-react'
import Modal from '../common/Modal'
import { getUserDocuments } from '../../api/admin'
import { openVerificationDocument } from '../../api/verification'
import { useToast } from '../../context/ToastContext'
import { DOC_KINDS, formatSize } from '../../utils/docs'
import '../performer/VerificationDocs.css'

// Окно проверки мастера: админ видит загруженные документы и решает, подтверждать ли профиль
export default function DocumentsModal({ user, busy, onToggle, onClose }) {
  const { show } = useToast()
  const [state, setState] = useState({ status: 'loading', docs: [], error: '' })
  const [opening, setOpening] = useState(null)

  useEffect(() => {
    let cancelled = false
    getUserDocuments(user.id)
      .then((docs) => { if (!cancelled) setState({ status: 'ready', docs, error: '' }) })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', docs: [], error: err?.error ?? 'Не удалось загрузить документы' })
      })
    return () => { cancelled = true }
  }, [user.id])

  async function open(doc) {
    setOpening(doc.id)
    try {
      await openVerificationDocument(doc.id)
    } catch (err) {
      show(err?.error ?? 'Не удалось открыть документ', 'error')
    } finally {
      setOpening(null)
    }
  }

  return (
    <Modal size="lg" title="Проверка мастера" onClose={onClose}>
      <p className="vd-who">
        <b>{user.fullName}</b>
        <span>{user.email}</span>
        {user.phone && <span>{user.phone}</span>}
      </p>

      {state.status === 'loading' && <p className="vd-hint">Загружаем документы...</p>}

      {state.status === 'error' && (
        <div className="vd-error" role="alert" style={{ marginTop: 14 }}><CircleAlert size={18} />{state.error}</div>
      )}

      {state.status === 'ready' && state.docs.length === 0 && (
        <p className="vd-empty">Мастер пока не загрузил документы. Подтвердить профиль можно и без них, но проверять нечего.</p>
      )}

      {state.docs.length > 0 && (
        <ul className="vd-list">
          {state.docs.map((d) => (
            <li key={d.id} className="vd-item">
              <span className="vd-ico"><FileText size={20} /></span>
              <div className="vd-info">
                <div className="vd-name" title={d.fileName}>{d.fileName}</div>
                <div className="vd-meta">
                  {DOC_KINDS[d.kind] ?? d.kind} · {formatSize(d.sizeBytes)} · {new Date(d.uploadedAt).toLocaleDateString('ru-RU')}
                </div>
              </div>
              <div className="vd-actions">
                <button type="button" className="vd-btn" disabled={opening === d.id} onClick={() => open(d)}>
                  <ExternalLink size={15} /> Открыть
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="vd-hint">
        Сверьте имя в документах с именем мастера. Документы видны только администраторам и самому мастеру.
      </p>

      <div className="vd-foot">
        <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Закрыть</button>
        <button
          type="button"
          className="btn btn-sm"
          disabled={busy}
          onClick={() => onToggle(user)}
        >
          {user.isVerified ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
          {user.isVerified ? 'Снять проверку' : 'Подтвердить мастера'}
        </button>
      </div>
    </Modal>
  )
}
