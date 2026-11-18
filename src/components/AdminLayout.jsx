import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell, ChartColumn, ChevronDown, Globe, LayoutGrid, LogOut, Settings, Star, Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './UserMenu.css'
import './AdminLayout.css'

const LOGO_SRC = '/logo.svg'

const NAV = [
  { to: '/admin', label: 'Пользователи', icon: Users, end: true },
  { to: '/admin/categories', label: 'Категории', icon: LayoutGrid },
  { to: '/admin/reviews', label: 'Отзывы', icon: Star },
  { to: '/admin/stats', label: 'Статистика', icon: ChartColumn },
]

function AdminMenu({ user, onLogout }) {
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

  const letter = (user.fullName || user.email || 'A').trim()[0]?.toUpperCase()

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu-btn adm-menu-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="adm-avatar">{letter}</span>
        <span className="adm-role">Администратор</span>
        <ChevronDown size={18} className={open ? 'flip' : ''} />
      </button>

      {open && (
        <div className="user-menu-list">
          <Link to="/" onClick={() => setOpen(false)}><Globe size={18} /> На сайт</Link>
          <button type="button" onClick={() => { setOpen(false); onLogout() }}>
            <LogOut size={18} /> Выйти
          </button>
        </div>
      )}
    </div>
  )
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="adm">
      <aside className="adm-side">
        <Link to="/admin" className="adm-logo" aria-label="FixHub">
          <img src={LOGO_SRC} alt="FixHub" />
        </Link>

        <nav className="adm-nav">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={22} strokeWidth={1.7} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-bottom">
          <NavLink to="/admin/settings"><Settings size={22} strokeWidth={1.7} /> Настройки</NavLink>
          <button type="button" onClick={handleLogout}><LogOut size={22} strokeWidth={1.7} /> Выйти</button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button type="button" className="adm-bell" aria-label="Уведомления">
            <Bell size={28} strokeWidth={1.6} />
          </button>
          <AdminMenu user={user} onLogout={handleLogout} />
        </header>

        <div className="adm-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}