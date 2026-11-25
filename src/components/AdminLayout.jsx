import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ChartColumn, Flag, History, LayoutGrid, LogOut, Menu, Settings, Star, Users } from 'lucide-react'
import { getComplaintsCount } from '../api/admin'
import { useAuth } from '../context/AuthContext'
import NotificationsBell from './NotificationsBell'
import './AdminLayout.css'

const LOGO_SRC = '/logo-admin.svg'

const NAV = [
  { to: '/admin', label: 'Пользователи', icon: Users, end: true },
  { to: '/admin/categories', label: 'Категории', icon: LayoutGrid },
  { to: '/admin/reviews', label: 'Отзывы', icon: Star },
  { to: '/admin/complaints', label: 'Жалобы', icon: Flag, badge: true },
  { to: '/admin/audit', label: 'Журнал', icon: History },
  { to: '/admin/stats', label: 'Статистика', icon: ChartColumn },
]

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [newComplaints, setNewComplaints] = useState(0)
  // на телефоне меню выезжает слева по кнопке ☰
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  // число новых жалоб обновляем при каждом переходе по админке, в том числе после решения жалобы
  useEffect(() => {
    let cancelled = false
    getComplaintsCount()
      .then((r) => { if (!cancelled) setNewComplaints(r.count) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [pathname])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="adm">
      {menuOpen && <div className="adm-overlay" onClick={closeMenu} />}
      <aside className={`adm-side${menuOpen ? ' open' : ''}`}>
        <Link to="/admin" className="adm-logo" aria-label="FixHub" onClick={closeMenu}>
          <img src={LOGO_SRC} alt="FixHub" />
        </Link>

        <nav className="adm-nav">
          {NAV.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} onClick={closeMenu}>
              <Icon size={22} strokeWidth={1.7} /> {label}
              {badge && newComplaints > 0 && (
                <span className="adm-badge" aria-label={`Новых: ${newComplaints}`}>{newComplaints > 99 ? '99+' : newComplaints}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="adm-bottom">
          <NavLink to="/admin/settings" onClick={closeMenu}><Settings size={22} strokeWidth={1.7} /> Настройки</NavLink>
          <button type="button" onClick={handleLogout}><LogOut size={22} strokeWidth={1.7} /> Выйти</button>
        </div>
      </aside>

      <div className="adm-main">
        <header className="adm-top">
          <button type="button" className="adm-burger" onClick={() => setMenuOpen((v) => !v)}
            aria-label="Меню" aria-expanded={menuOpen}><Menu size={26} /></button>
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