import { useRef, useState } from 'react'
import { CircleAlert, ImagePlus, X } from 'lucide-react'
import { uploadPhoto } from '../api/uploads'
import { useAuthGuard } from '../utils/useAuthGuard'
import './Features.css'

const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png']

// Загрузка нескольких фото: value — массив адресов, onChange получает новый массив.
export default function PhotoPicker({ value, onChange, max, label, hint }) {
  const guard = useAuthGuard()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(fileList) {
    const files = Array.from(fileList ?? [])
    if (fileRef.current) fileRef.current.value = ''
    if (files.length === 0) return

    const room = max - value.length
    if (files.length > room) setError(`Можно добавить ещё ${room > 0 ? room : 0} фото, лишние пропущены`)
    else setError('')

    const picked = files.slice(0, Math.max(room, 0))
    const uploaded = []
    setBusy(true)
    for (const file of picked) {
      if (!TYPES.includes(file.type)) { setError('Подходят только файлы JPG и PNG'); continue }
      if (file.size > MAX_BYTES) { setError('Файл больше 5 МБ'); continue }
      try {
        const { url } = await uploadPhoto(file)
        uploaded.push(url)
      } catch (err) {
        if (guard(err)) break
        setError(err?.error ?? 'Не удалось загрузить фото')
      }
    }
    setBusy(false)
    if (uploaded.length) onChange([...value, ...uploaded])
  }

  return (
    <div className="field photo-picker">
      <span className="field-label">{label} <small>{value.length} из {max}</small></span>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" multiple hidden
        onChange={(e) => handleFiles(e.target.files)} />
      <div className="photo-picker-grid">
        {value.map((url) => (
          <div key={url} className="photo-picker-item">
            <img src={url} alt="" />
            <button type="button" aria-label="Удалить фото" disabled={busy}
              onClick={() => onChange(value.filter((u) => u !== url))}>
              <X size={14} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" className="photo-picker-add" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <span className="spinner" aria-hidden="true" /> : <ImagePlus size={22} strokeWidth={1.6} />}
            <span>{busy ? 'Загрузка' : 'Добавить'}</span>
          </button>
        )}
      </div>
      {hint && <small className="photo-picker-hint">{hint}</small>}
      {error && <span className="field-error" role="alert"><CircleAlert size={15} />{error}</span>}
    </div>
  )
}
