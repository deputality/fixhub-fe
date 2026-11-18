import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ClipboardList, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './CabinetLayout.css'

export default function CabinetLayout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="cab">
      <aside className="cab-side">
        <nav>
          <NavLink to="/orders"><ClipboardList size={22} /> Мои заказы</NavLink>
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