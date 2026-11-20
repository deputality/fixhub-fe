import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleCheck, Info, ShieldCheck, Star } from 'lucide-react'
import { getProfile, updateProfile } from '../api/profile'
import {
  getMyServices, getPerformerReviews, getPerformerStats, uploadServicePhoto,
} from '../api/performer'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import Avatar from '../components/Avatar'
import './PerformerProfilePage.css'

// в API одно поле fullName, а в макете «Имя» и «Фамилия»: делим по первому пробелу
function splitName(full = '') {
  const t = full.trim()
  const i = t.indexOf(' ')
  return i === -1 ? { first: t, last: '' } : { first: t.slice(0, i), last: t.slice(i + 1).trim() }
}

function toForm(p) {
  const { first, last } = splitName(p.fullName)
  return {
    firstName: first,
    lastName: last,
    phone: p.phone ?? '',
    specialization: p.specialization ?? '',
    experienceYears: p.experienceYears ?? '',
    city: p.city ?? '',
    serviceArea: p.serviceArea ?? '',
    bio: p.bio ?? '',
    avatarUrl: p.avatarUrl ?? '',
  }
}

function pluralReviews(n) {
  const m10 = n % 10, m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'отзыва'
  return 'отзывов'
}

function Field({ label, children, hint, error, className = '' }) {
  return (
    <label className={`pp-field ${className}`}>
      <span className="pp-label">{label}</span>
      {children}
      {error ? <span className="pp-error">{error}</span> : hint && <span className="pp-hint">{hint}</span>}
    </label>
  )
}

export default function PerformerProfilePage() {
  const { user, updateUser } = useAuth()
  const guard = useAuthGuard()
  const { show } = useToast()
  const fileRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [stats, setStats] = useState(null)
  const [rating, setRating] = useState(null)
  const [published, setPublished] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let alive = true
    getProfile()
      .then((p) => { if (alive) { setProfile(p); setForm(toForm(p)) } })
      .catch((e) => { if (alive && !guard(e)) setLoadError(e?.error || 'Не удалось загрузить профиль') })
    // блоки справа и счётчики не должны ломать страницу, если запрос не прошёл
    getPerformerStats().then((s) => alive && setStats(s)).catch(() => {})
    getPerformerReviews({ pageSize: 1 }).then((r) => alive && setRating(r)).catch(() => {})
    getMyServices().then((l) => alive && setPublished(l.some((s) => s.isActive))).catch(() => {})
    return () => { alive = false }
  }, [guard])

  if (loadError) return <div className="pp"><div className="form-alert" role="alert">{loadError}</div></div>
  if (!form) return <div className="pp"><div className="pp-loading"><span className="spinner" /></div></div>

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const fullName = `${form.firstName} ${form.lastName}`.trim()
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(profile))

  function validate() {
    const er = {}
    if (!form.firstName.trim()) er.firstName = 'Укажите имя'
    if (form.phone && !/^[+\d][\d\s()-]{5,}$/.test(form.phone.trim())) er.phone = 'Проверьте номер телефона'
    const years = form.experienceYears === '' ? null : Number(form.experienceYears)
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 80)) er.experienceYears = 'От 0 до 80 лет'
    setErrors(er)
    return Object.keys(er).length === 0
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const saved = await updateProfile({
        fullName,
        phone: form.phone.trim() || null,
        bio: form.bio.trim() || null,
        specialization: form.specialization.trim() || null,
        experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
        city: form.city.trim() || null,
        serviceArea: form.serviceArea.trim() || null,
        avatarUrl: form.avatarUrl || null,
      })
      setProfile(saved)
      setForm(toForm(saved))
      // имя, фото и специализация в шапке и боковом меню обновятся сами
      updateUser({
        fullName: saved.fullName, phone: saved.phone,
        avatarUrl: saved.avatarUrl, specialization: saved.specialization,
      })
      show('Изменения сохранены')
    } catch (err) {
      if (guard(err)) return
      const msg = err?.errors ? Object.values(err.errors).flat()[0] : err?.error
      show(msg || 'Не удалось сохранить изменения', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setForm(toForm(profile))
    setErrors({})
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { show('Файл больше 5 МБ', 'error'); return }
    setUploading(true)
    try {
      const { url } = await uploadServicePhoto(file)
      setForm((f) => ({ ...f, avatarUrl: url }))
    } catch (err) {
      if (!guard(err)) show(err?.error || 'Не удалось загрузить фото', 'error')
    } finally {
      setUploading(false)
    }
  }

  const completed = stats?.completedOrders
  const hasRating = rating?.rating != null

  return (
    <div className="pp">
      <div className="pp-head">
        <div>
          <h1>Мой профиль</h1>
          <p>Расскажите о себе, чтобы клиенты выбирали вас с уверенностью.</p>
        </div>
        <Link to={`/performers/${profile.id}`} className="pp-view">Посмотреть профиль</Link>
      </div>

      <section className="pp-card pp-summary">
        <Avatar name={fullName || user.fullName} url={form.avatarUrl} size={88} />
        <div className="pp-summary-main">
          <div className="pp-name">
            {fullName || user.fullName}
            {profile.isVerified && <CircleCheck size={20} strokeWidth={1.6} className="pp-ok" aria-label="Проверенный мастер" />}
          </div>
          <div className="pp-role">{form.specialization || 'Мастер'}</div>
          <div className="pp-photo-row">
            <button type="button" className="pp-link" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Загрузка…' : 'Изменить фото'}
            </button>
            <span className="pp-hint">JPG, PNG до 5 МБ</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png" hidden onChange={handlePhoto} />
          </div>
        </div>

        <div className="pp-stats">
          <div className="pp-stat">
            <b>{completed ?? '—'}</b>
            <span>Выполнено заказов</span>
            <i>За всё время</i>
          </div>
          <div className="pp-stat">
            <b>
              <Star size={22} strokeWidth={1.6} className="pp-star" />
              {hasRating ? Number(rating.rating).toFixed(1) : '—'}
            </b>
            <span>Рейтинг мастера</span>
            <i>{rating ? (rating.reviewCount ? `На основе ${rating.reviewCount} ${pluralReviews(rating.reviewCount)}` : 'Пока нет отзывов') : ' '}</i>
          </div>
        </div>
      </section>

      <form className="pp-grid" onSubmit={handleSave} noValidate>
        <div className="pp-col">
          <section className="pp-card">
            <h2>Личные данные</h2>
            <div className="pp-fields">
              <Field label="Имя" error={errors.firstName}>
                <input className="pp-input" value={form.firstName} onChange={set('firstName')} maxLength={100} />
              </Field>
              <Field label="Фамилия">
                <input className="pp-input" value={form.lastName} onChange={set('lastName')} maxLength={100} />
              </Field>
              <Field label="Телефон" error={errors.phone}>
                <input className="pp-input" type="tel" value={form.phone} onChange={set('phone')} maxLength={30} />
              </Field>
              <Field label="Электронная почта">
                <input className="pp-input" value={profile.email} readOnly disabled />
              </Field>
            </div>
          </section>

          <section className="pp-card">
            <h2>Профессиональная информация</h2>
            <div className="pp-fields">
              <Field label="Специализация">
                <input className="pp-input" value={form.specialization} onChange={set('specialization')} maxLength={100} />
              </Field>
              <Field label="Опыт работы" error={errors.experienceYears}>
                <div className="pp-unit">
                  <input className="pp-input" type="number" min="0" max="80" inputMode="numeric"
                    value={form.experienceYears} onChange={set('experienceYears')} />
                  <span>лет</span>
                </div>
              </Field>
              <Field label="Город">
                <input className="pp-input" value={form.city} onChange={set('city')} maxLength={100} />
              </Field>
              <Field label="Район выезда">
                <input className="pp-input" value={form.serviceArea} onChange={set('serviceArea')} maxLength={200} />
              </Field>
              <Field label="О себе" className="pp-wide" hint="Расскажите о своём опыте, подходе к работе и гарантиях.">
                <textarea className="pp-input pp-textarea" rows={2} value={form.bio} onChange={set('bio')} maxLength={2000} />
              </Field>
            </div>
          </section>

          <div className="pp-actions">
            <button type="submit" className="pp-save" disabled={saving || !dirty}>
              {saving && <span className="spinner" />} Сохранить изменения
            </button>
            <button type="button" className="pp-cancel" disabled={saving || !dirty} onClick={handleCancel}>Отменить</button>
          </div>
        </div>

        <aside className="pp-col">
          {profile.isVerified ? (
            <section className="pp-card pp-side">
              <h2><ShieldCheck size={24} strokeWidth={1.6} className="pp-shield" /> Проверенный мастер</h2>
              <p className="pp-side-text">Ваши данные проверены. Клиенты видят отметку доверия в вашем профиле.</p>
              <ul className="pp-checks">
                <li><CircleCheck size={18} strokeWidth={1.6} /><div><b>Личность подтверждена</b><span>Документы прошли проверку</span></div></li>
                <li><CircleCheck size={18} strokeWidth={1.6} /><div><b>Телефон подтверждён</b><span>Номер доступен для связи</span></div></li>
                <li><CircleCheck size={18} strokeWidth={1.6} /><div><b>Почта подтверждена</b><span>Уведомления о заказах включены</span></div></li>
              </ul>
            </section>
          ) : (
            <section className="pp-card pp-side">
              <h2><ShieldCheck size={24} strokeWidth={1.6} className="pp-shield off" /> Профиль не проверен</h2>
              <p className="pp-side-text">Отметка «Проверенный мастер» появится после проверки ваших данных администратором.</p>
            </section>
          )}

          <section className="pp-card pp-side">
            <h2>Профиль в каталоге</h2>
            {published !== null && (
              <span className={`pp-pub${published ? '' : ' off'}`}><i />{published ? 'Опубликован' : 'Не опубликован'}</span>
            )}
            <p className="pp-side-text">
              {published === false
                ? 'Добавьте хотя бы одну услугу, чтобы клиенты могли найти вас в каталоге.'
                : 'Клиенты могут найти вас в каталоге и отправить заявку на ваши услуги.'}
            </p>
            <Link to="/performer/services" className="pp-link-a">Перейти к моим услугам →</Link>
          </section>

          <p className="pp-note"><Info size={18} strokeWidth={1.5} />Телефон и почта доступны только вам и клиентам с подтверждённым заказом.</p>
        </aside>
      </form>
    </div>
  )
}
