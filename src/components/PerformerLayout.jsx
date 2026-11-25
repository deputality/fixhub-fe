import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Briefcase, ClipboardList, House, Images, LogOut, Settings, Star, User } from 'lucide-react'
import { getPerformerStats } from '../api/performer'
import { getProfile } from '../api/profile'
import Avatar from './Avatar'
import { useAuth } from '../context/AuthContext'
import { LOGO_SRC } from '../utils/brand'
import { useScrolled } from '../utils/useScrolled'
import NotificationsBell from './NotificationsBell'
import UserMenu from './UserMenu'
import './PerformerLayout.css'

export default function PerformerLayout() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const scrolled = useScrolled()

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
      {/* та же шапка, что на сайте: логотип, меню и отступы совпадают, поэтому при переходе ничего не прыгает */}
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="container site-header-inner">
          <Link to="/performer" className="site-logo" aria-label="FixHub">
            <img src={LOGO_SRC} alt="FixHub" />
          </Link>
          <nav className="site-nav">
            <NavLink to="/" end>Каталог</NavLink>
            <NavLink to="/how">Как это работает</NavLink>
          </nav>
          <div className="header-actions">
            <NotificationsBell />
            <UserMenu inPanel />
          </div>
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
            <NavLink to="/performer/portfolio"><Images size={22} strokeWidth={1.7} /> Портфолио</NavLink>
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
