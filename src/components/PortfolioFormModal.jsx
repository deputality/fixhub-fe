import { useRef, useState } from 'react'
import { CircleAlert, ImagePlus } from 'lucide-react'
import { createPortfolioItem, updatePortfolioItem } from '../api/portfolio'
import { uploadServicePhoto } from '../api/performer'
import { useAuthGuard } from '../utils/useAuthGuard'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import PhotoPicker from './PhotoPicker'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png']

// Одно поле загрузки фото: «до» (необязательно) или «после» (обязательно)
function PhotoField({ label, hint, url, onChange, error, setError }) {
  const guard = useAuthGuard()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(file) {
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return setError('Подходят только файлы JPG и PNG')
    if (file.size > MAX_PHOTO_BYTES) return setError('Файл больше 5 МБ')

    setError('')
    setUploading(true)
    try {
      const { url: uploaded } = await uploadServicePhoto(file)
      onChange(uploaded)
    } catch (err) {
      if (!guard(err)) setError(err?.error ?? 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden
        onChange={(e) => handleFile(e.target.files?.[0])} />

      {url ? (
        <div className={`pf-photo${uploading ? ' busy' : ''}`}>
          <img src={url} alt={label} />
          {uploading && <span className="pf-photo-wait"><span className="spinner" aria-hidden="true" /></span>}
          <div className="pf-photo-actions">
            <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>Заменить</button>
            <button type="button" className="danger" disabled={uploading} onClick={() => onChange('')}>Удалить</button>
          </div>
        </div>
      ) : (
        <button type="button" className="pf-upload" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <span className="spinner" aria-hidden="true" /> : <ImagePlus size={26} strokeWidth={1.6} />}
          <span>{uploading ? 'Загружаем...' : 'Выбрать фото'}</span>
          <small>{hint}</small>
        </button>
      )}
      {error && <span className="field-error" role="alert"><CircleAlert size={15} />{error}</span>}
    </div>
  )
}

// item: работа для редактирования либо null для новой
export default function PortfolioFormModal({ item, onClose, onSaved }) {
  const guard = useAuthGuard()

  const [title, setTitle] = useState(item?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [beforeUrl, setBeforeUrl] = useState(item?.beforeUrl ?? '')
  const [afterUrl, setAfterUrl] = useState(item?.afterUrl ?? '')
  const [photoUrls, setPhotoUrls] = useState(item?.photoUrls ?? [])
  const [beforeError, setBeforeError] = useState('')
  const [afterError, setAfterError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    let ok = true
    if (!title.trim()) { setTitleError('Введите название работы'); ok = false }
    if (!afterUrl) { setAfterError('Загрузите фото результата'); ok = false }
    if (!ok) return

    setBusy(true)
    setFormError('')
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      beforeUrl: beforeUrl || null,
      afterUrl,
      photoUrls,
    }
    try {
      const saved = item ? await updatePortfolioItem(item.id, body) : await createPortfolioItem(body)
      onSaved(saved, !item)
    } catch (err) {
      if (!guard(err)) setFormError(err?.error ?? 'Не удалось сохранить работу')
      setBusy(false)
    }
  }

  return (
    <Modal title={item ? 'Редактировать работу' : 'Новая работа'} size="lg" onClose={() => !busy && onClose()}>
      <form className="pf-form" onSubmit={submit} noValidate>
        <Input id="pw-title" label="Название" placeholder="Например: Замена смесителя на кухне" maxLength={200}
          value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(''); setFormError('') }} error={titleError} />

        <div className="field">
          <label className="field-label" htmlFor="pw-desc">Описание (необязательно)</label>
          <textarea id="pw-desc" className="pf-textarea" rows={3} maxLength={1000}
            placeholder="Что было сделано, сколько времени заняло, какие материалы использовали"
            value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="pf-form-row">
          <PhotoField label="Фото «до» (необязательно)" hint="JPG или PNG, до 5 МБ"
            url={beforeUrl} onChange={setBeforeUrl} error={beforeError} setError={setBeforeError} />
          <PhotoField label="Фото «после»" hint="Обязательно, JPG или PNG, до 5 МБ"
            url={afterUrl} onChange={(u) => { setAfterUrl(u); setAfterError('') }} error={afterError} setError={setAfterError} />
        </div>

        <PhotoPicker label="Ещё фото" max={10} value={photoUrls} onChange={setPhotoUrls}
          hint="До 10 дополнительных фото работы, JPG или PNG, до 5 МБ каждое" />

        {formError && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>}

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button type="submit" loading={busy}>{item ? 'Сохранить' : 'Добавить работу'}</Button>
        </div>
      </form>
    </Modal>
  )
}
