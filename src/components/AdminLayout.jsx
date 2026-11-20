import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ChartColumn, LayoutGrid, LogOut, Settings, Star, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NotificationsBell from './NotificationsBell'
import './AdminLayout.css'

const LOGO_SRC = '/logo.svg'

const NAV = [
  { to: '/admin', label: 'Пользователи', icon: Users, end: true },
  { to: '/admin/categories', label: 'Категории', icon: LayoutGrid },
  { to: '/admin/reviews', label: 'Отзывы', icon: Star },
  { to: '/admin/stats', label: 'Статистика', icon: ChartColumn },
]

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
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
          <NotificationsBell />
          <Link to="/admin/settings" className="adm-user" aria-label="Настройки профиля">
            <span className="adm-avatar">{initials(user?.fullName)}</span>
            <span className="adm-role">Администратор</span>
          </Link>
        </header>

        <div className="adm-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}