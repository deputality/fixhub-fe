import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, ChartColumn, LayoutGrid, LogOut, Settings, Star, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './AdminLayout.css'

const LOGO_SRC = '/logo.svg'

const NAV = [
  { to: '/admin', label: 'Пользователи', icon: Users, end: true },
  { to: '/admin/categories', label: 'Категории', icon: LayoutGrid },
  { to: '/admin/reviews', label: 'Отзывы', icon: Star },
  { to: '/admin/stats', label: 'Статистика', icon: ChartColumn },
]

export default function AdminLayout() {
  const { logout } = useAuth()
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
        </header>

        <div className="adm-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}