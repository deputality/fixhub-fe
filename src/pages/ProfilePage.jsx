import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, Lock, Mail, Phone, Star, User } from 'lucide-react'
import { getProfile, updateProfile } from '../api/profile'
import { getMyServices, getPerformerReviews, getPerformerStats } from '../api/performer'
import { getMyOrders, getMyReviews } from '../api/orders'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import Button from '../components/Button'
import Input from '../components/Input'
import './ProfilePage.css'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

function validate({ fullName, phone }) {
  const errors = {}
  if (!fullName.trim()) errors.fullName = 'Введите имя и фамилию'
  const digits = phone.replace(/\D/g, '')
  if (phone.trim() && (digits.length < 9 || digits.length > 15)) {
    errors.phone = 'Введите корректный номер, например +375 29 857 17 12'
  }
  return errors
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { show } = useToast()
  const guard = useAuthGuard()
  const isPerformer = user.role === 'Performer'

  const [state, setState] = useState({ status: 'loading', profile: null, error: '' })
  const [form, setForm] = useState({ fullName: '', phone: '', bio: '' })
  const [numbers, setNumbers] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((profile) => {
        if (cancelled) return
        setForm({ fullName: profile.fullName, phone: profile.phone ?? '', bio: profile.bio ?? '' })
        setState({ status: 'ready', profile, error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', profile: null, error: err?.error ?? 'Не удалось загрузить профиль' })
      })
    return () => { cancelled = true }
  }, [guard])

  // цифры в шапке профиля
  useEffect(() => {
    let cancelled = false
    const load = isPerformer
      ? Promise.all([getPerformerStats(), getPerformerReviews({ pageSize: 1 }), getMyServices()]).then(
          ([stats, reviews, services]) => ({
            first: { value: stats.completedOrders, label: 'Выполнено заказов' },
            second: reviews.rating != null
              ? { value: Number(reviews.rating).toFixed(1), label: 'Рейтинг мастера', note: `На основе ${reviews.reviewCount} отзывов`, star: true }
              : { value: '—', label: 'Рейтинг мастера', note: 'Пока нет отзывов', star: true },
            published: services.filter((s) => s.isActive).length,
            total: services.length,
          }),
        )
      : Promise.all([getMyOrders(), getMyReviews().catch(() => [])]).then(([orders, reviews]) => ({
          first: { value: orders.length, label: 'Заказов всего' },
          second: { value: reviews.length, label: 'Отзывов оставлено' },
        }))
    load.then((n) => { if (!cancelled) setNumbers(n) }).catch(() => {})
    return () => { cancelled = true }
  }, [isPerformer])

  const { profile } = state
  const dirty = useMemo(() => {
    if (!profile) return false
    return form.fullName !== profile.fullName
      || form.phone !== (profile.phone ?? '')
      || (isPerformer && form.bio !== (profile.bio ?? ''))
  }, [form, profile, isPerformer])

  function change(key) {
    return (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setFormError('')
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  function reset() {
    setForm({ fullName: profile.fullName, phone: profile.phone ?? '', bio: profile.bio ?? '' })
    setErrors({})
    setFormError('')
  }

  async function submit(e) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setFormError('')
    try {
      const saved = await updateProfile({
        fullName: form.fullName.trim(),
        phone: form.phone.trim() || null,
        // у клиента поле «О себе» не показываем, поэтому сохраняем то, что уже есть
        bio: isPerformer ? (form.bio.trim() || null) : (profile.bio ?? null),
      })
      setState({ status: 'ready', profile: saved, error: '' })
      setForm({ fullName: saved.fullName, phone: saved.phone ?? '', bio: saved.bio ?? '' })
      updateUser({ fullName: saved.fullName, phone: saved.phone })
      show('Изменения сохранены')
    } catch (err) {
      if (!guard(err)) setFormError(err?.error ?? 'Не удалось сохранить изменения')
    } finally {
      setSaving(false)
    }
  }

  if (state.status === 'loading') {
    return (
      <div className="prof" aria-hidden="true">
        <div className="skeleton prof-sk-title" />
        <div className="skeleton prof-sk-head" />
        <div className="skeleton prof-sk-card" />
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="prof">
        <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}. Обновите страницу.</span></div>
      </div>
    )
  }

  return (
    <div className="prof">
      <h1 className="prof-title">Мой профиль</h1>
      <p className="prof-lead">
        {isPerformer
          ? 'Расскажите о себе, чтобы клиенты выбирали вас с уверенностью.'
          : 'Контактные данные, которые подставляются при оформлении заказа.'}
      </p>

      <section className="prof-head">
        <span className="prof-avatar">{initials(profile.fullName)}</span>
        <div className="prof-who">
          <div className="prof-name">{profile.fullName}</div>
          <div className="prof-role">{isPerformer ? 'Мастер' : 'Клиент'}</div>
        </div>
        {numbers && (
          <div className="prof-numbers">
            <div>
              <b>{numbers.first.value}</b>
              <span>{numbers.first.label}</span>
            </div>
            <div>
              <b>{numbers.second.star && <Star size={18} fill="#f59e0b" stroke="#f59e0b" />}{numbers.second.value}</b>
              <span>{numbers.second.label}</span>
              {numbers.second.note && <small>{numbers.second.note}</small>}
            </div>
          </div>
        )}
      </section>

      <form className="prof-grid" onSubmit={submit} noValidate>
        <div className="prof-main">
          <section className="prof-card">
            <h2>Личные данные</h2>
            <div className="prof-fields">
              <Input id="p-name" label="Имя и фамилия" icon={<User size={20} />} maxLength={200}
                value={form.fullName} onChange={change('fullName')} error={errors.fullName} autoComplete="name" />
              <Input id="p-phone" type="tel" label="Телефон" icon={<Phone size={20} />} maxLength={30}
                placeholder="+375 (29) 857-17-12" value={form.phone} onChange={change('phone')}
                error={errors.phone} autoComplete="tel" />
              <div className="prof-wide">
                <Input id="p-email" label="Электронная почта" icon={<Mail size={20} />} value={profile.email} readOnly disabled />
                <span className="prof-hint"><Lock size={13} /> Почту изменить нельзя, она используется для входа</span>
              </div>
            </div>
          </section>

          {isPerformer && (
            <section className="prof-card">
              <h2>О себе</h2>
              <textarea className="prof-textarea" rows={5} maxLength={2000}
                placeholder="Расскажите о своём опыте, подходе к работе и гарантиях"
                value={form.bio} onChange={change('bio')} aria-label="О себе" />
              <span className="prof-hint">{form.bio.length} / 2000</span>
            </section>
          )}

          {formError && (
            <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>
          )}

          <div className="prof-actions">
            <Button type="submit" loading={saving} disabled={!dirty}>Сохранить изменения</Button>
            <Button type="button" variant="outline" onClick={reset} disabled={!dirty || saving}>Отмена</Button>
          </div>
        </div>

        <aside className="prof-side">
          {isPerformer ? (
            <section className="prof-card">
              <h2>Профиль в каталоге</h2>
              {numbers ? (
                <>
                  <span className={`prof-pill ${numbers.published > 0 ? 'on' : 'off'}`}>
                    {numbers.published > 0 ? 'Опубликован' : 'Нет опубликованных услуг'}
                  </span>
                  <p className="prof-text">
                    В каталоге видно услуг: {numbers.published} из {numbers.total}. Клиенты находят вас по услугам и отправляют заявки.
                  </p>
                </>
              ) : (
                <p className="prof-text">Загрузка...</p>
              )}
              <Link to="/performer/services" className="prof-link">Перейти к моим услугам →</Link>
            </section>
          ) : (
            <section className="prof-card">
              <h2>Мои заказы</h2>
              <p className="prof-text">Следите за статусом заказов и оставляйте отзывы о выполненных услугах.</p>
              <Link to="/orders" className="prof-link">Перейти к заказам →</Link>
            </section>
          )}
        </aside>
      </form>
    </div>
  )
}
