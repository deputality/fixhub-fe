import { useEffect, useState } from 'react'
import { CircleAlert, Lock, Mail, Phone, User } from 'lucide-react'
import { getProfile, updateProfile } from '../api/profile'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import Button from '../components/Button'
import Input from '../components/Input'
import './AdminPage.css'
import './AdminSections.css'

function validate({ fullName, phone }) {
  const errors = {}
  if (!fullName.trim()) errors.fullName = 'Введите имя и фамилию'
  const digits = phone.replace(/\D/g, '')
  if (phone.trim() && (digits.length < 9 || digits.length > 15)) {
    errors.phone = 'Введите корректный номер, например +375 29 857 17 12'
  }
  return errors
}

export default function AdminSettings() {
  const { updateUser } = useAuth()
  const { show } = useToast()
  const guard = useAuthGuard()
  const [state, setState] = useState({ status: 'loading', profile: null, error: '' })
  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    getProfile()
      .then((profile) => {
        if (cancelled) return
        setForm({ fullName: profile.fullName, phone: profile.phone ?? '' })
        setState({ status: 'ready', profile, error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', profile: null, error: err?.error ?? 'Не удалось загрузить профиль' })
      })
    return () => { cancelled = true }
  }, [guard])

  const { profile } = state
  const dirty = profile && (form.fullName !== profile.fullName || form.phone !== (profile.phone ?? ''))

  function change(key) {
    return (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setFormError('')
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
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
        // «О себе» у администратора нет, оставляем как было
        bio: profile.bio ?? null,
      })
      setState({ status: 'ready', profile: saved, error: '' })
      setForm({ fullName: saved.fullName, phone: saved.phone ?? '' })
      updateUser({ fullName: saved.fullName, phone: saved.phone })
      show('Изменения сохранены')
    } catch (err) {
      if (!guard(err)) setFormError(err?.error ?? 'Не удалось сохранить изменения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-head">
        <h1>Настройки</h1>
        <p>Контактные данные администратора.</p>
      </header>

      {state.status === 'error' && (
        <div className="form-alert adm-alert" role="alert"><CircleAlert size={18} /><span>{state.error}. Обновите страницу.</span></div>
      )}

      {state.status === 'loading' && <i className="adm-skel" style={{ height: 260, maxWidth: 720, borderRadius: 14 }} />}

      {profile && (
        <form className="adm-panel as-settings" onSubmit={submit} noValidate>
          <div className="adm-panel-head"><h2>Личные данные</h2></div>

          {formError && <div className="form-alert as-form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>}

          <div className="as-settings-grid">
            <Input id="s-name" label="Имя и фамилия" icon={<User size={20} />} maxLength={200}
              value={form.fullName} onChange={change('fullName')} error={errors.fullName} autoComplete="name" />
            <Input id="s-phone" type="tel" label="Телефон" icon={<Phone size={20} />} maxLength={30}
              placeholder="+375 (29) 857-17-12" value={form.phone} onChange={change('phone')}
              error={errors.phone} autoComplete="tel" />
            <div className="as-wide">
              <Input id="s-email" label="Электронная почта" icon={<Mail size={20} />} value={profile.email} readOnly disabled />
              <span className="as-hint"><Lock size={13} /> Почту изменить нельзя, она используется для входа</span>
            </div>
          </div>

          <div className="as-save">
            <Button type="submit" className="btn-sm" loading={saving} disabled={!dirty}>Сохранить изменения</Button>
          </div>
        </form>
      )}
    </div>
  )
}
