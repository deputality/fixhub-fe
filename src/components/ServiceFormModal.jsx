import { useMemo, useRef, useState } from 'react'
import { CircleAlert, ImagePlus } from 'lucide-react'
import { createService, updateService, uploadServicePhoto } from '../api/performer'
import { useAuthGuard } from '../utils/useAuthGuard'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import Select from './Select'

const UNIT_OPTIONS = [
  { value: 'Hour', label: 'За час' },
  { value: 'Piece', label: 'За штуку' },
]

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png']

// service: существующая услуга для редактирования, либо null для новой
export default function ServiceFormModal({ service, categories, onClose, onSaved }) {
  const guard = useAuthGuard()
  const fileRef = useRef(null)

  const categoryOptions = useMemo(() => {
    const roots = categories.filter((c) => !c.parentId)
    return roots.flatMap((root) => [
      { value: String(root.id), label: root.name },
      ...categories
        .filter((c) => c.parentId === root.id)
        .map((c) => ({ value: String(c.id), label: c.name, depth: 1 })),
    ])
  }, [categories])

  const [categoryId, setCategoryId] = useState(String(service?.categoryId ?? categoryOptions[0]?.value ?? ''))
  const [title, setTitle] = useState(service?.title ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [price, setPrice] = useState(service ? String(service.price) : '')
  const [unit, setUnit] = useState(service?.unit ?? 'Hour')
  const [photoUrl, setPhotoUrl] = useState(service?.photoUrl ?? '')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  function clear(key) {
    setFormError('')
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
  }

  async function handleFile(file) {
    if (!file) return
    if (!PHOTO_TYPES.includes(file.type)) return setPhotoError('Подходят только файлы JPG и PNG')
    if (file.size > MAX_PHOTO_BYTES) return setPhotoError('Файл больше 5 МБ')

    setPhotoError('')
    setUploading(true)
    try {
      const { url } = await uploadServicePhoto(file)
      setPhotoUrl(url)
    } catch (err) {
      if (!guard(err)) setPhotoError(err?.error ?? 'Не удалось загрузить фото')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit(e) {
    e.preventDefault()
    const next = {}
    const value = Number(String(price).replace(',', '.'))
    if (!categoryId) next.category = 'Выберите категорию'
    if (!title.trim()) next.title = 'Введите название'
    if (!description.trim()) next.description = 'Опишите услугу'
    if (!(value >= 0.01)) next.price = 'Укажите цену больше нуля'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    setFormError('')
    const body = {
      categoryId: Number(categoryId),
      title: title.trim(),
      description: description.trim(),
      photoUrl: photoUrl || null,
      price: value,
      unit,
    }
    try {
      const saved = service ? await updateService(service.id, body) : await createService(body)
      onSaved(saved, !service)
    } catch (err) {
      if (!guard(err)) setFormError(err?.error ?? 'Не удалось сохранить услугу')
      setBusy(false)
    }
  }

  return (
    <Modal title={service ? 'Редактировать услугу' : 'Новая услуга'} onClose={() => !busy && onClose()}>
      <form className="pf-form" onSubmit={submit} noValidate>
        <div className="field">
          <span className="field-label">Категория</span>
          <Select value={categoryId} onChange={(v) => { setCategoryId(v); clear('category') }} options={categoryOptions} ariaLabel="Категория" />
          {errors.category && <span className="field-error" role="alert"><CircleAlert size={15} />{errors.category}</span>}
        </div>

        <Input id="svc-title" label="Название" placeholder="Например: Генеральная уборка квартиры" maxLength={200}
          value={title} onChange={(e) => { setTitle(e.target.value); clear('title') }} error={errors.title} />

        <div className="field">
          <label className="field-label" htmlFor="svc-desc">Описание</label>
          <textarea id="svc-desc" className={`pf-textarea${errors.description ? ' has-error' : ''}`} rows={4} maxLength={4000}
            placeholder="Что входит в услугу, чем вы пользуетесь, какие гарантии даёте"
            value={description} onChange={(e) => { setDescription(e.target.value); clear('description') }} />
          {errors.description && <span className="field-error" role="alert"><CircleAlert size={15} />{errors.description}</span>}
        </div>

        <div className="pf-form-row">
          <Input id="svc-price" label="Цена, BYN" inputMode="decimal" placeholder="50" maxLength={10}
            value={price} onChange={(e) => { setPrice(e.target.value); clear('price') }} error={errors.price} />
          <div className="field">
            <span className="field-label">Как считается</span>
            <Select value={unit} onChange={setUnit} options={UNIT_OPTIONS} ariaLabel="Единица цены" />
          </div>
        </div>

        <div className="field">
          <span className="field-label">Фото услуги (необязательно)</span>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" hidden
            onChange={(e) => handleFile(e.target.files?.[0])} />

          {photoUrl ? (
            <div className={`pf-photo${uploading ? ' busy' : ''}`}>
              <img src={photoUrl} alt="Фото услуги" />
              {uploading && <span className="pf-photo-wait"><span className="spinner" aria-hidden="true" /></span>}
              <div className="pf-photo-actions">
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}>Заменить</button>
                <button type="button" className="danger" disabled={uploading} onClick={() => setPhotoUrl('')}>Удалить</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className={`pf-upload${dragOver ? ' drag' : ''}`}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
            >
              {uploading ? <span className="spinner" aria-hidden="true" /> : <ImagePlus size={28} strokeWidth={1.6} />}
              <span>{uploading ? 'Загружаем...' : 'Выбрать фото или перетащить сюда'}</span>
              <small>JPG или PNG, до 5 МБ</small>
            </button>
          )}
          {photoError && <span className="field-error" role="alert"><CircleAlert size={15} />{photoError}</span>}
        </div>

        {formError && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>}

        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Отмена</Button>
          <Button type="submit" loading={busy} disabled={uploading}>{service ? 'Сохранить' : 'Добавить услугу'}</Button>
        </div>
      </form>
    </Modal>
  )
}
