import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Briefcase, CalendarClock, ChevronDown, ClipboardList, House, Images, LogOut, MessageSquareText, Settings, Star, User } from 'lucide-react'
import { getPerformerStats } from '../../api/performer'
import { getProfile } from '../../api/profile'
import Avatar from '../common/Avatar'
import { useAuth } from '../../context/AuthContext'
import { useLogoSrc } from '../../utils/theme'
import { useScrolled } from '../../utils/useScrolled'
import NotificationsBell from '../layout/NotificationsBell'
import ThemeToggle from '../common/ThemeToggle'
import UserMenu from '../layout/UserMenu'
import './PerformerLayout.css'

const SECTIONS = [
  { to: '/performer', label: 'Главная', icon: House },
  { to: '/performer/services', label: 'Мои услуги', icon: Briefcase },
  { to: '/performer/portfolio', label: 'Портфолио', icon: Images },
  { to: '/performer/orders', label: 'Входящие заказы', icon: ClipboardList },
  { to: '/performer/requests', label: 'Запросы клиентов', icon: MessageSquareText },
  { to: '/performer/schedule', label: 'Расписание', icon: CalendarClock },
  { to: '/performer/reviews', label: 'Отзывы', icon: Star },
  { to: '/performer/profile', label: 'Профиль', icon: User },
  { to: '/performer/settings', label: 'Настройки', icon: Settings },
]

export default function PerformerLayout() {
  const { user, logout, updateUser } = useAuth()
  const logoSrc = useLogoSrc()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [stats, setStats] = useState(null)
  // на телефоне список разделов раскрывается под полосой с названием текущего раздела
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const current = SECTIONS.find((x) => x.to !== '/performer' && (pathname === x.to || pathname.startsWith(x.to + '/'))) ?? SECTIONS[0]
  const CurrentIcon = current.icon
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
            <img src={logoSrc} alt="FixHub" />
          </Link>
          <nav className="site-nav">
            <NavLink to="/" end>Каталог</NavLink>
            <NavLink to="/how">Как это работает</NavLink>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu inPanel />
          </div>
        </div>
      </header>

      {/* телефон и планшет: полоса с названием текущего раздела, по нажатию раскрывает список разделов */}
      <button type="button" className={`pf-switch${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen((v) => !v)}
        aria-expanded={menuOpen} aria-label="Разделы панели мастера">
        <CurrentIcon size={20} />
        <span>{current.label}</span>
        {newOrders > 0 && current.to !== '/performer/orders' && <span className="pf-switch-badge">{newOrders}</span>}
        <ChevronDown size={20} className="pf-switch-arrow" />
      </button>

      <div className="pf-body">
        {menuOpen && <div className="pf-overlay" onClick={closeMenu} />}
        <aside className={`pf-side${menuOpen ? ' open' : ''}`}>
          <div className="pf-side-inner">
          <div className="pf-me">
            <Avatar name={user.fullName} url={user.avatarUrl} size={52} />
            <div>
              <div className="pf-me-name">{user.fullName}</div>
              <div className="pf-me-role">{user.specialization || 'Мастер'}</div>
            </div>
          </div>

          <nav className="pf-nav">
            <NavLink to="/performer" end onClick={closeMenu}><House size={22} strokeWidth={1.7} /> Главная</NavLink>
            <NavLink to="/performer/services" onClick={closeMenu}><Briefcase size={22} strokeWidth={1.7} /> Мои услуги</NavLink>
            <NavLink to="/performer/portfolio" onClick={closeMenu}><Images size={22} strokeWidth={1.7} /> Портфолио</NavLink>
            <NavLink to="/performer/orders" onClick={closeMenu}>
              <ClipboardList size={22} strokeWidth={1.7} /> Входящие заказы
              {newOrders > 0 && <span key={newOrders} className="pf-badge">{newOrders}</span>}
            </NavLink>
            <NavLink to="/performer/requests" onClick={closeMenu}><MessageSquareText size={22} strokeWidth={1.7} /> Запросы клиентов</NavLink>
            <NavLink to="/performer/schedule" onClick={closeMenu}><CalendarClock size={22} strokeWidth={1.7} /> Расписание</NavLink>
            <NavLink to="/performer/reviews" onClick={closeMenu}><Star size={22} strokeWidth={1.7} /> Отзывы</NavLink>
            <NavLink to="/performer/profile" onClick={closeMenu}><User size={22} strokeWidth={1.7} /> Профиль</NavLink>
            <NavLink to="/performer/settings" onClick={closeMenu}><Settings size={22} strokeWidth={1.7} /> Настройки</NavLink>
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
