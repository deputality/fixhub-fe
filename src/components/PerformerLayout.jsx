import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Briefcase, ChevronDown, ClipboardList, Globe, House, LogOut, Settings, Star, User,
} from 'lucide-react'
import { getPerformerStats } from '../api/performer'
import { getProfile } from '../api/profile'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import NotificationsBell from './NotificationsBell'
import './UserMenu.css'
import './PerformerLayout.css'

const LOGO_SRC = '/logo-master.svg'

function TopMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu-btn pf-user-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={user.fullName} url={user.avatarUrl} size={42} />
        <span className="user-name">{user.fullName}</span>
        <ChevronDown size={18} className={open ? 'flip' : ''} />
      </button>
      {open && (
        <div className="user-menu-list">
          <Link to="/" onClick={() => setOpen(false)}><Globe size={18} /> На сайт</Link>
          <Link to="/performer/profile" onClick={() => setOpen(false)}><User size={18} /> Профиль</Link>
          <button type="button" onClick={() => { setOpen(false); onLogout() }}>
            <LogOut size={18} /> Выйти
          </button>
        </div>
      )}
    </div>
  )
}

export default function PerformerLayout() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)

  const reloadStats = useCallback(() => {
    getPerformerStats().then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    reloadStats()
  }, [reloadStats])

  // фото и специализация приходят только из профиля, в данных входа их нет
  useEffect(() => {
    getProfile()
      .then((p) => updateUser({ avatarUrl: p.avatarUrl, specialization: p.specialization }))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const newOrders = stats?.newOrders ?? 0

  return (
    <div className="pf">
      <header className="pf-top">
        <Link to="/performer" className="pf-logo" aria-label="FixHub">
          <img src={LOGO_SRC} alt="FixHub" />
        </Link>
        <nav className="pf-top-nav">
          <Link to="/">Каталог</Link>
          <Link to="/how">Как это работает</Link>
        </nav>
        <div className="pf-top-right">
          <NotificationsBell />
          <TopMenu user={user} onLogout={handleLogout} />
        </div>
      </header>

      <div className="pf-body">
        <aside className="pf-side">
          <div className="pf-side-inner">
          <div className="pf-me">
            <Avatar name={user.fullName} url={user.avatarUrl} size={52} />
            <div>
              <div className="pf-me-name">{user.fullName}</div>
              <div className="pf-me-role">{user.specialization || 'Мастер'}</div>
            </div>
          </div>

          <nav className="pf-nav">
            <NavLink to="/performer" end><House size={22} strokeWidth={1.7} /> Главная</NavLink>
            <NavLink to="/performer/services"><Briefcase size={22} strokeWidth={1.7} /> Мои услуги</NavLink>
            <NavLink to="/performer/orders">
              <ClipboardList size={22} strokeWidth={1.7} /> Входящие заказы
              {newOrders > 0 && <span key={newOrders} className="pf-badge">{newOrders}</span>}
            </NavLink>
            <NavLink to="/performer/reviews"><Star size={22} strokeWidth={1.7} /> Отзывы</NavLink>
            <NavLink to="/performer/profile"><User size={22} strokeWidth={1.7} /> Профиль</NavLink>
            <NavLink to="/performer/settings"><Settings size={22} strokeWidth={1.7} /> Настройки</NavLink>
            <div className="pf-sep" />
            <button type="button" onClick={handleLogout}><LogOut size={22} strokeWidth={1.7} /> Выйти</button>
          </nav>
          </div>
        </aside>

        <main className="pf-content">
          <Outlet context={{ stats, reloadStats }} />
        </main>
      </div>
    </div>
  )
}
