import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ClipboardList, Globe, Heart, LayoutDashboard, LogOut, MessageSquareText, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../common/Avatar'
import './UserMenu.css'

// Одно меню пользователя для сайта и панели мастера.
// inPanel: меню открыто из панели, поэтому вместо «Панель мастера» ведёт «На сайт».
export default function UserMenu({ inPanel = false }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
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

  const close = () => setOpen(false)

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Avatar name={user.fullName} url={user.avatarUrl} size={42} />
        <span className="user-name">{user.fullName}</span>
        <ChevronDown size={18} className={open ? 'flip' : ''} />
      </button>

      {open && (
        <div className="user-menu-list">
          {user.role === 'Performer' ? (
            <>
              {inPanel
                ? <Link to="/" onClick={close}><Globe size={18} /> На сайт</Link>
                : <Link to="/performer" onClick={close}><LayoutDashboard size={18} /> Панель мастера</Link>}
              <Link to="/performer/profile" onClick={close}><User size={18} /> Профиль</Link>
            </>
          ) : (
            <>
              <Link to="/orders" onClick={close}><ClipboardList size={18} /> Мои заказы</Link>
              <Link to="/requests" onClick={close}><MessageSquareText size={18} /> Запросы цены</Link>
              <Link to="/favorites" onClick={close}><Heart size={18} /> Избранное</Link>
              <Link to="/profile" onClick={close}><User size={18} /> Профиль</Link>
            </>
          )}
          <button type="button" onClick={() => { close(); logout(); navigate(inPanel ? '/login' : '/') }}>
            <LogOut size={18} /> Выйти
          </button>
        </div>
      )}
    </div>
  )
}
