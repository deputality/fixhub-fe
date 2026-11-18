import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ClipboardList, LogOut, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import './UserMenu.css'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default function UserMenu() {
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

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="avatar">{initials(user.fullName)}</span>
        <span className="user-name">{user.fullName}</span>
        <ChevronDown size={18} className={open ? 'flip' : ''} />
      </button>

      {open && (
        <div className="user-menu-list">
          <Link to="/orders" onClick={() => setOpen(false)}><ClipboardList size={18} /> Мои заказы</Link>
          <Link to="/profile" onClick={() => setOpen(false)}><User size={18} /> Профиль</Link>
          <button type="button" onClick={() => { setOpen(false); logout(); navigate('/') }}>
            <LogOut size={18} /> Выйти
          </button>
        </div>
      )}
    </div>
  )
}