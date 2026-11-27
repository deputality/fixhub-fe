import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleAlert, CircleCheck, Eye, EyeOff, KeyRound } from 'lucide-react'
import { resetPassword } from '../../api/auth'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import '../info/StaticPages.css'
import { useLogoSrc } from '../../utils/theme'

export default function ResetPasswordPage() {
  const logoSrc = useLogoSrc()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [show, setShow] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const found = {}
    if (password.length < 8) found.password = 'Пароль должен быть не короче 8 символов'
    if (repeat !== password) found.repeat = 'Пароли не совпадают'
    setErrors(found)
    if (Object.keys(found).length) return

    setLoading(true)
    setError('')
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err?.error ?? 'Не удалось изменить пароль. Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  const eye = (
    <button type="button" className="icon-btn" onClick={() => setShow((v) => !v)} aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}>
      {show ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
  )

  let content
  if (!token) {
    content = (
      <>
        <div className="form-alert" role="alert" style={{ marginBottom: 20 }}>
          <CircleAlert size={18} /><span>В ссылке нет кода для сброса. Запросите письмо ещё раз.</span>
        </div>
        <Link to="/forgot-password" className="btn btn-primary btn-block">Запросить ссылку</Link>
      </>
    )
  } else if (done) {
    content = (
      <>
        <div className="form-ok" role="status"><CircleCheck size={18} /><span>Пароль изменён. Теперь можно войти с новым паролем.</span></div>
        <Link to="/login" className="btn btn-primary btn-block">Войти</Link>
      </>
    )
  } else {
    content = (
      <form onSubmit={submit} className="auth-form" noValidate>
        <Input
          id="password" type={show ? 'text' : 'password'} label="Новый пароль" icon={<KeyRound size={20} />}
          placeholder="Не короче 8 символов" autoComplete="new-password" autoFocus right={eye}
          value={password} error={errors.password}
          onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })); setError('') }}
        />
        <Input
          id="repeat" type={show ? 'text' : 'password'} label="Повторите пароль" icon={<KeyRound size={20} />}
          placeholder="Ещё раз новый пароль" autoComplete="new-password"
          value={repeat} error={errors.repeat}
          onChange={(e) => { setRepeat(e.target.value); setErrors((p) => ({ ...p, repeat: undefined })); setError('') }}
        />
        {error && (
          <div className="form-alert" role="alert">
            <CircleAlert size={18} />
            <span>{error} <Link to="/forgot-password" className="link-btn">Запросить новую ссылку</Link></span>
          </div>
        )}
        <Button type="submit" block loading={loading}>Сохранить пароль</Button>
      </form>
    )
  }

  return (
    <div className="auth-layout">
      <div className="auth-bg" aria-hidden="true"><i /><i /><i /></div>
      <Link to="/" className="auth-logo"><img src={logoSrc} alt="FixHub" /></Link>

      <main className="auth-solo">
        <section className="auth-card">
          <h1>Новый пароль</h1>
          <p className="auth-sub">Придумайте пароль, которым будете входить на FixHub.</p>
          {content}
          {!done && <Link to="/login" className="back-link"><ArrowLeft size={16} /> Вернуться ко входу</Link>}
        </section>
      </main>
    </div>
  )
}
