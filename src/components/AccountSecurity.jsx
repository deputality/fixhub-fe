import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, CircleCheck, Eye, EyeOff, KeyRound, Trash2 } from 'lucide-react'
import { changePassword, deleteAccount } from '../api/profile'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Button from './Button'
import Input from './Input'
import './AccountSecurity.css'

// Безопасность аккаунта в профиле: смена пароля (у мастера она есть в «Настройках», поэтому только у клиента)
// и удаление аккаунта (у всех, кроме администратора).
export default function AccountSecurity({ showPassword = true }) {
  return (
    <div className="acc">
      {showPassword && <PasswordCard />}
      <DeleteCard />
    </div>
  )
}

function PasswordCard() {
  const [form, setForm] = useState({ current: '', next: '', repeat: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [changed, setChanged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  function change(key) {
    return (e) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      setErrors((p) => ({ ...p, [key]: undefined }))
      setFormError('')
      setChanged(false)
    }
  }

  async function submit(e) {
    e.preventDefault()
    const found = {}
    if (!form.current) found.current = 'Введите текущий пароль'
    if (form.next.length < 8) found.next = 'Пароль должен быть не короче 8 символов'
    else if (form.next === form.current) found.next = 'Новый пароль должен отличаться от текущего'
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

  const type = show ? 'text' : 'password'
  const eye = (
    <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)}
      aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}>
      {show ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
  )

  return (
    <section className="prof-card acc-card">
      <h2>Смена пароля</h2>
      <form className="acc-form" onSubmit={submit} noValidate>
        <Input id="acc-cur" type={type} label="Текущий пароль" icon={<KeyRound size={20} />} autoComplete="current-password"
          value={form.current} onChange={change('current')} error={errors.current} right={eye} />
        <Input id="acc-new" type={type} label="Новый пароль" icon={<KeyRound size={20} />} autoComplete="new-password"
          placeholder="Не короче 8 символов" value={form.next} onChange={change('next')} error={errors.next} />
        <Input id="acc-rep" type={type} label="Повторите новый пароль" icon={<KeyRound size={20} />} autoComplete="new-password"
          value={form.repeat} onChange={change('repeat')} error={errors.repeat} />
        {formError && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{formError}</span></div>}
        {changed && <div className="acc-ok" role="status"><CircleCheck size={18} /> Пароль изменён</div>}
        <div><Button type="submit" className="btn-sm" loading={busy}>Сменить пароль</Button></div>
      </form>
    </section>
  )
}

function DeleteCard() {
  const { logout } = useAuth()
  const { show } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function cancel() {
    setOpen(false)
    setPassword('')
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (!password) {
      setError('Введите пароль, чтобы подтвердить удаление')
      return
    }
    setBusy(true)
    setError('')
    try {
      await deleteAccount(password)
      logout()
      navigate('/')
      show('Аккаунт удалён')
    } catch (err) {
      setError(err?.error ?? 'Не удалось удалить аккаунт')
      setBusy(false)
    }
  }

  return (
    <section className="prof-card acc-card acc-danger">
      <h2>Удаление аккаунта</h2>
      <p className="acc-text">
        Имя, телефон, почта и фото будут удалены, войти в аккаунт после этого нельзя. История заказов у других участников
        сохранится без ваших данных. Действие необратимо.
      </p>

      {!open ? (
        <Button type="button" variant="outline" className="btn-sm acc-del-btn" onClick={() => setOpen(true)}>
          <Trash2 size={18} /> Удалить аккаунт
        </Button>
      ) : (
        <form className="acc-form" onSubmit={submit} noValidate>
          <Input id="acc-del" type="password" label="Пароль для подтверждения" icon={<KeyRound size={20} />}
            autoComplete="current-password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }} />
          <span className="acc-hint">
            Входили через Google и не задавали пароль? Сначала задайте его через «Забыли пароль» на странице входа.
          </span>
          {error && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
          <div className="acc-row">
            <Button type="submit" variant="danger" className="btn-sm" loading={busy}>Удалить навсегда</Button>
            <Button type="button" variant="outline" className="btn-sm" onClick={cancel} disabled={busy}>Отмена</Button>
          </div>
        </form>
      )}
    </section>
  )
}
