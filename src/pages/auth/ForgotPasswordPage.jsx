import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, CircleCheck, Mail } from 'lucide-react'
import { forgotPassword } from '../../api/auth'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import '../info/StaticPages.css'
import { useLogoSrc } from '../../utils/theme'

export default function ForgotPasswordPage() {
  const logoSrc = useLogoSrc()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [error, setError] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    const value = email.trim()
    if (!value) return setFieldError('Введите электронную почту')
    if (!/^\S+@\S+\.\S+$/.test(value)) return setFieldError('Введите корректный адрес почты')

    setLoading(true)
    setError('')
    try {
      const res = await forgotPassword(value)
      setSentMessage(res?.message ?? 'Мы отправили ссылку для сброса пароля')
    } catch (err) {
      setError(err?.error ?? 'Не удалось отправить письмо. Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-bg" aria-hidden="true"><i /><i /><i /></div>
      <Link to="/" className="auth-logo"><img src={logoSrc} alt="FixHub" /></Link>

      <main className="auth-solo">
        <section className="auth-card">
          <h1>Восстановление пароля</h1>
          <p className="auth-sub">Укажите почту, с которой вы регистрировались. Мы отправим на неё ссылку для создания нового пароля.</p>

          {sentMessage ? (
            <div className="form-ok" role="status">
              <CircleCheck size={18} />
              <span>{sentMessage}. Проверьте также папку «Спам»; письмо можно запросить повторно через минуту.</span>
            </div>
          ) : (
            <form onSubmit={submit} className="auth-form" noValidate>
              <Input
                id="email" type="email" label="Электронная почта" icon={<Mail size={20} />}
                placeholder="example@mail.com" autoComplete="email" autoFocus
                value={email} error={fieldError}
                onChange={(e) => { setEmail(e.target.value); setFieldError(''); setError('') }}
              />
              {error && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
              <Button type="submit" block loading={loading}>Отправить ссылку</Button>
            </form>
          )}

          <Link to="/login" className="back-link"><ArrowLeft size={16} /> Вернуться ко входу</Link>
        </section>
      </main>
    </div>
  )
}
