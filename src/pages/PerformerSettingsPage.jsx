import { useEffect, useState } from 'react'
import { CircleAlert, CircleCheck, Eye, EyeOff, KeyRound } from 'lucide-react'
import { changePassword, getProfile, updateEmailNotifications } from '../api/profile'
import { useToast } from '../context/ToastContext'
import Button from '../components/Button'
import Input from '../components/Input'
import './StaticPages.css'
import './PerformerPages.css'

export default function PerformerSettingsPage() {
  const { show } = useToast()
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({ current: '', next: '', repeat: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [changed, setChanged] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getProfile().then(setProfile).catch((err) => setLoadError(err?.error ?? 'Не удалось загрузить настройки'))
  }, [])

  async function toggleEmail() {
    const next = !profile.emailNotifications
    setSaving(true)
    try {
      setProfile(await updateEmailNotifications(next))
      show(next ? 'Письма о заказах включены' : 'Письма о заказах отключены')
    } catch (err) {
      show(err?.error ?? 'Не удалось сохранить настройку', 'error')
    } finally {
      setSaving(false)
    }
  }

  function change(key) {
    return (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setErrors((p) => ({ ...p, [key]: undefined }))
      setFormError('')
      setChanged(false)
    }
  }

  async function submitPassword(e) {
    e.preventDefault()
    const found = {}
    if (!form.current) found.current = 'Введите текущий пароль'
    if (form.next.length < 8) found.next = 'Пароль должен быть не короче 8 символов'
    if (form.repeat !== form.next) found.repeat = 'Пароли не совпадают'
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    setFormError('')
    try {
      await changePassword(form.current, form.next)
      setForm({ current: '', next: '', repeat: '' })
      setChanged(true)
    } catch (err) {
      setFormError(err?.error ?? 'Не удалось изменить пароль')
    } finally {
      setBusy(false)
    }
  }

  const eye = (
    <button type="button" className="icon-btn" onClick={() => setShowPass((v) => !v)} aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}>
      {showPass ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
  )
  const type = showPass ? 'text' : 'password'

  return (
    <div className="ps">
      <h1>Настройки</h1>
      <p className="ps-sub">Уведомления и безопасность аккаунта.</p>

      {loadError && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{loadError}</span></div>}

      {profile && (
        <section className="ps-card">
          <h2>Уведомления</h2>
          <div className="ps-row">
            <div>
              <b>Письма о заказах и отзывах</b>
              <span>Будем писать на {profile.email}, когда придёт новый заказ или отзыв. Уведомления на сайте остаются в любом случае.</span>
            </div>
            <button
              type="button" role="switch" className="ps-switch" aria-label="Письма о заказах и отзывах"
              aria-checked={profile.emailNotifications} disabled={saving} onClick={toggleEmail}
            />
          </div>
        </section>
      )}

      <section className="ps-card">
        <h2>Смена пароля</h2>
        <form className="ps-form" onSubmit={submitPassword} noValidate>
          <Input
            id="cur" type={type} label="Текущий пароль" icon={<KeyRound size={20} />} autoComplete="current-password"
            value={form.current} onChange={change('current')} error={errors.current} right={eye}
          />
          <Input
            id="new" type={type} label="Новый пароль" icon={<KeyRound size={20} />} autoComplete="new-password"
            placeholder="Не короче 8 символов" value={form.next} onChange={change('next')} error={errors.next}
          />
          <Input
            id="rep" type={type} label="Повторите новый пароль" icon={<KeyRound size={20} />} autoComplete="new-password"
            value={form.repeat} onChange={change('repeat')} error={errors.repeat}
          />
          {formError && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>}
          {changed && <div className="form-ok" role="status"><CircleCheck size={18} /> Пароль изменён</div>}
          <div><Button type="submit" className="btn-sm" loading={busy}>Сменить пароль</Button></div>
        </form>
      </section>
    </div>
  )
}
