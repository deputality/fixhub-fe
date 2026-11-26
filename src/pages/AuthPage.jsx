import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Briefcase, CircleAlert, Clock, Eye, EyeOff, KeyRound,
  Mail, MapPin, ShieldCheck, Star, User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'
import { requestGoogleAccessToken } from '../utils/google'
import { useLogoSrc } from '../utils/theme'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

const FEATURES = [
  { icon: <ShieldCheck />, title: 'Проверенные специалисты', text: 'Проверяем документы и отзывы' },
  { icon: <Clock />, title: 'Быстрый отклик', text: 'Мастера выходят на связь в течение 15 минут' },
  { icon: <Star />, title: 'Честные цены', text: 'Без скрытых платежей и переплат' },
  { icon: <MapPin />, title: 'Услуги рядом', text: 'Специалисты из вашего города' },
]

const ROLES = [
  { value: 'Client', title: 'Клиент', hint: 'Ищу услуги', icon: <User /> },
  { value: 'Performer', title: 'Исполнитель', hint: 'Предоставляю услуги', icon: <Briefcase /> },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// возвращает объект с ошибками по полям (пустой объект, если всё верно)
function validate({ fullName, email, password }, isRegister) {
  const errors = {}

  if (isRegister && !fullName.trim()) {
    errors.fullName = 'Введите имя и фамилию'
  }

  if (!email.trim()) {
    errors.email = 'Введите электронную почту'
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = 'Введите корректный адрес, например example@mail.com'
  }

  if (!password) {
    errors.password = 'Введите пароль'
  } else if (isRegister && password.length < 8) {
    errors.password = 'Пароль должен быть не короче 8 символов'
  }

  return errors
}

function homeFor(role) {
  if (role === 'Admin') return '/admin'
  if (role === 'Performer') return '/performer'
  return '/'
}

// куда вести после входа: на страницу, с которой выкинуло на вход, если она подходит роли
function targetFor(role, from) {
  if (typeof from !== 'string' || !from.startsWith('/')) return homeFor(role)
  const isAdminPath = from === '/admin' || from.startsWith('/admin/')
  const isPerformerPath = from === '/performer' || from.startsWith('/performer/')
  if (role === 'Admin') return isAdminPath ? from : homeFor(role)
  if (role === 'Performer') return isPerformerPath ? from : homeFor(role)
  return isAdminPath || isPerformerPath || from.startsWith('/login') || from.startsWith('/register') ? homeFor(role) : from
}

export default function AuthPage() {
  const logoSrc = useLogoSrc()
  const { pathname, state } = useLocation()
  const isRegister = pathname === '/register'
  const { login, register, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Client')
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  function resetFeedback() {
    setError('')
    setFieldErrors({})
  }

  // обработчик ввода: сохраняет значение и убирает ошибку этого поля
  function handleChange(setter, key) {
    return (e) => {
      setter(e.target.value)
      setError('')
      setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const errors = validate({ fullName, email, password }, isRegister)
    setFieldErrors(errors)

    if (isRegister && !agreed) errors.agreed = 'Подтвердите согласие, чтобы зарегистрироваться'

    const firstInvalid = ['fullName', 'email', 'password', 'agreed'].find((k) => errors[k])
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setLoading(true)
    try {
      const user = isRegister
        ? await register({ email: email.trim(), password, fullName: fullName.trim(), role })
        : await login(email.trim(), password)
      // администратор попадает сразу в свою панель
      navigate(targetFor(user.role, state?.from))
    } catch (err) {
      setError(err.error ?? 'Не удалось выполнить запрос. Попробуйте ещё раз')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    // через Google на странице регистрации создаётся аккаунт, поэтому согласие нужно и здесь
    if (isRegister && !agreed) {
      setFieldErrors((prev) => ({ ...prev, agreed: 'Подтвердите согласие, чтобы зарегистрироваться' }))
      document.getElementById('agreed')?.focus()
      return
    }
    setGoogleLoading(true)
    try {
      const accessToken = await requestGoogleAccessToken(GOOGLE_CLIENT_ID)
      // роль отправляем только со страницы регистрации
      const user = await loginWithGoogle(accessToken, isRegister ? role : undefined)
      navigate(targetFor(user.role, state?.from))
    } catch (err) {
      // окно закрыто пользователем — это не ошибка
      if (err?.type === 'popup_closed' || err?.error === 'access_denied') return
      setError(err?.error ?? err?.message ?? 'Не удалось войти через Google')
    } finally {
      setGoogleLoading(false)
    }
  }

  const mode = isRegister ? 'register' : 'login'

  return (
    <div className="auth-layout">
      <div className="auth-bg" aria-hidden="true"><i /><i /><i /></div>
      <Link to="/" className="auth-logo">
        <img src={logoSrc} alt="FixHub" />
      </Link>

      <main className="auth-main">
        <section className="auth-info">
          <span className="auth-badge">
            <ShieldCheck size={16} /> Надёжные специалисты рядом
          </span>
          <h1>Быстрые решения для ваших задач</h1>
          <p>
            FixHub - это удобная платформа для поиска проверенных мастеров и
            специалистов в вашем городе. От ремонта техники до репетиторства и
            фотосессий.
          </p>
          <ul className="features">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="feature-icon">{f.icon}</span>
                <div>
                  <div className="feature-title">{f.title}</div>
                  <div className="feature-text">{f.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-card">
          <div className="tabs">
            <Link
              to="/login"
              onClick={resetFeedback}
              className={`tab${!isRegister ? ' active' : ''}`}
            >
              Вход
            </Link>
            <Link
              to="/register"
              onClick={resetFeedback}
              className={`tab${isRegister ? ' active' : ''}`}
            >
              Регистрация
            </Link>
            <span className={`tab-indicator${isRegister ? ' right' : ''}`} />
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {/* имя: плавно появляется только при регистрации */}
            <div className={`collapse${isRegister ? ' open' : ''}`} aria-hidden={!isRegister}>
              <div className="collapse-inner">
                <Input
                  id="fullName"
                  label="Имя и фамилия"
                  icon={<User size={20} />}
                  placeholder="Иван Иванов"
                  value={fullName}
                  onChange={handleChange(setFullName, 'fullName')}
                  error={fieldErrors.fullName}
                  maxLength={200}
                  autoComplete="name"
                />
              </div>
            </div>

            <Input
              id="email"
              type="email"
              label="Электронная почта"
              icon={<Mail size={20} />}
              placeholder="example@mail.com"
              value={email}
              onChange={handleChange(setEmail, 'email')}
              error={fieldErrors.email}
              autoComplete="email"
            />

            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              label="Пароль"
              icon={<KeyRound size={20} />}
              placeholder="Введите пароль"
              value={password}
              onChange={handleChange(setPassword, 'password')}
              error={fieldErrors.password}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              right={
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                </button>
              }
            />

            {!isRegister && (
              <div className="forgot-row"><Link to="/forgot-password">Забыли пароль?</Link></div>
            )}

            {/* выбор роли: плавно появляется только при регистрации */}
            <div className={`collapse${isRegister ? ' open' : ''}`} aria-hidden={!isRegister}>
              <div className="collapse-inner">
                <div className="field">
                  <span className="field-label">Выберите роль</span>
                  <div className="roles">
                    {ROLES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={`role-card${role === r.value ? ' active' : ''}`}
                        aria-pressed={role === r.value}
                        onClick={() => setRole(r.value)}
                      >
                        <span className="role-icon">{r.icon}</span>
                        <span>
                          <span className="role-title">{r.title}</span>
                          <span className="role-hint">{r.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* согласие: плавно появляется только при регистрации */}
            <div className={`collapse${isRegister ? ' open' : ''}`} aria-hidden={!isRegister}>
              <div className="collapse-inner">
                <div className="field">
                  <label className={`consent${fieldErrors.agreed ? ' has-error' : ''}`} htmlFor="agreed">
                    <input
                      id="agreed"
                      type="checkbox"
                      checked={agreed}
                      tabIndex={isRegister ? 0 : -1}
                      onChange={(e) => {
                        setAgreed(e.target.checked)
                        setError('')
                        setFieldErrors((prev) => (prev.agreed ? { ...prev, agreed: undefined } : prev))
                      }}
                    />
                    <span>
                      Я принимаю <Link to="/terms" target="_blank" tabIndex={isRegister ? 0 : -1}>Условия использования</Link> и
                      даю согласие на обработку персональных данных согласно{' '}
                      <Link to="/privacy" target="_blank" tabIndex={isRegister ? 0 : -1}>Политике конфиденциальности</Link>
                    </span>
                  </label>
                  {fieldErrors.agreed && (
                    <span className="field-error" role="alert"><CircleAlert size={15} />{fieldErrors.agreed}</span>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="form-alert" role="alert">
                <CircleAlert size={18} />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" block loading={loading}>
              <span key={mode + loading} className="swap">
                 {loading ? 'Подождите' : isRegister ? 'Зарегистрироваться' : 'Войти'}
              </span>
            </Button>

            <div className="divider"><span>или</span></div>

            <Button
              type="button"
              variant="outline"
              block
              loading={googleLoading}
              disabled={!GOOGLE_CLIENT_ID}
              title={GOOGLE_CLIENT_ID ? undefined : 'Не задан VITE_GOOGLE_CLIENT_ID'}
              onClick={handleGoogle}
            >
              <span key={mode} className="swap">
                {isRegister ? 'Зарегистрироваться через Google' : 'Войти через Google'}
              </span>
            </Button>

            <p className="switch">
              <span key={mode} className="swap">
                {isRegister ? (
                  <>Уже есть аккаунт? <Link to="/login" onClick={resetFeedback}>Войдите</Link></>
                ) : (
                  <>Нет аккаунта? <Link to="/register" onClick={resetFeedback}>Зарегистрируйтесь</Link></>
                )}
              </span>
            </p>
          </form>
        </section>

        <aside className="auth-hero">
          <img
            src="/hero.png"
            alt=""
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div className="hero-caption">
            <svg className="hero-arrow" viewBox="0 0 110 64" fill="none" aria-hidden="true">
              <path
                d="M104 54 C62 60 26 42 8 8 M8 8 L9 29 M8 8 L29 14"
                stroke="#2563eb"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="hero-note">Ваши домашние задачи в надёжных руках!</p>
          </div>
        </aside>
      </main>
    </div>
  )
}