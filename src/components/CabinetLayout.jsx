import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Heart, LogOut, MessageSquareText, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './CabinetLayout.css'

// Боковое меню кабинета видно на компьютере и планшете.
// На телефоне те же разделы лежат в меню ☰ в шапке сайта (Header.jsx), второго меню на странице нет.
export default function CabinetLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="cab">
      <aside className="cab-side">
        <nav>
          <NavLink to="/orders" className={pathname === '/cart/sent' ? 'active' : undefined}><ClipboardList size={22} /> Мои заказы</NavLink>
          <NavLink to="/requests"><MessageSquareText size={22} /> Запросы цены</NavLink>
          <NavLink to="/favorites"><Heart size={22} /> Избранное</NavLink>
          <NavLink to="/profile"><User size={22} /> Профиль</NavLink>
          <button type="button" onClick={handleLogout}><LogOut size={22} /> Выйти</button>
        </nav>
      </aside>
      <div className="cab-content">
        <Outlet />
      </div>
    </div>
  )
}
