import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleAlert, ExternalLink, FileText, Trash2, Upload } from 'lucide-react'
import {
  deleteVerificationDocument, getVerification, openVerificationDocument, uploadVerificationDocument,
} from '../../api/verification'
import { useToast } from '../../context/ToastContext'
import { DOC_KINDS, DOC_KIND_OPTIONS, formatSize } from '../../utils/docs'
import Select from '../common/Select'
import './VerificationDocs.css'

const MAX_DOCS = 5
const MAX_BYTES = 8 * 1024 * 1024

// Блок «Документы для проверки» в профиле мастера
export default function VerificationDocs() {
  const { show } = useToast()
  const fileRef = useRef(null)
  const [kind, setKind] = useState('Passport')
  const [docs, setDocs] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getVerification()
      .then((d) => setDocs(d.documents))
      .catch((err) => setError(err?.error ?? 'Не удалось загрузить документы'))
  }, [])

  useEffect(load, [load])

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')

    if (file.size > MAX_BYTES) { setError('Файл больше 8 МБ'); return }

    setBusy(true)
    try {
      const doc = await uploadVerificationDocument(file, kind)
      setDocs((d) => [...(d ?? []), doc])
      show('Документ загружен')
    } catch (err) {
      setError(err?.error ?? 'Не удалось загрузить файл')
    } finally {
      setBusy(false)
    }
  }

  async function remove(doc) {
    setBusy(true)
    setError('')
    try {
      await deleteVerificationDocument(doc.id)
      setDocs((d) => d.filter((x) => x.id !== doc.id))
    } catch (err) {
      setError(err?.error ?? 'Не удалось удалить документ')
    } finally {
      setBusy(false)
    }
  }

  async function open(doc) {
    try {
      await openVerificationDocument(doc.id)
    } catch (err) {
      setError(err?.error ?? 'Не удалось открыть документ')
    }
  }

  const full = docs != null && docs.length >= MAX_DOCS

  return (
    <section className="pp-card pp-side">
      <h2>Документы для проверки</h2>
      <p className="pp-side-text">
        Загрузите фото паспорта и документы о квалификации: так администратор быстрее проверит профиль.
        Файлы видите только вы и администратор.
      </p>

      {docs != null && docs.length > 0 && (
        <ul className="vd-list">
          {docs.map((d) => (
            <li key={d.id} className="vd-item">
              <span className="vd-ico"><FileText size={20} /></span>
              <div className="vd-info">
                <div className="vd-name" title={d.fileName}>{d.fileName}</div>
                <div className="vd-meta">{DOC_KINDS[d.kind] ?? d.kind} · {formatSize(d.sizeBytes)}</div>
              </div>
              <div className="vd-actions">
                <button type="button" className="vd-btn" onClick={() => open(d)} aria-label="Открыть документ">
                  <ExternalLink size={15} />
                </button>
                <button type="button" className="vd-btn danger" disabled={busy} onClick={() => remove(d)} aria-label="Удалить документ">
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="vd-upload">
        {error && <div className="vd-error" role="alert"><CircleAlert size={16} />{error}</div>}

        <div className="vd-upload-row">
          <Select value={kind} onChange={setKind} options={DOC_KIND_OPTIONS} ariaLabel="Тип документа" />
          <button type="button" className="vd-pick" disabled={busy || full} onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> {busy ? 'Загрузка...' : 'Загрузить файл'}
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" hidden onChange={pick} />

        <p className="vd-note">
          {full ? `Загружено максимум файлов: ${MAX_DOCS}. Удалите ненужный, чтобы добавить другой.` : `JPG, PNG или PDF до 8 МБ, не больше ${MAX_DOCS} файлов.`}
        </p>
      </div>
    </section>
  )
}
