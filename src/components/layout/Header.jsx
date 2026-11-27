import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardList, Heart, LayoutDashboard, LogOut, Menu, MessageSquareText, ShoppingCart, User, X } from 'lucide-react'
import { getProfile } from '../../api/profile'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useFavorites } from '../../context/FavoritesContext'
import { useLogoSrc } from '../../utils/theme'
import { useScrolled } from '../../utils/useScrolled'
import NotificationsBell from './NotificationsBell'
import Avatar from '../common/Avatar'
import ThemeToggle from '../common/ThemeToggle'
import UserMenu from './UserMenu'

export default function Header() {
  const { user, logout, updateUser } = useAuth()
  const logoSrc = useLogoSrc()
  const { count } = useCart()
  const { count: favCount } = useFavorites()
  const showCart = !user || user.role === 'Client'
  const scrolled = useScrolled()
  // запоминаем, на какой странице открыто меню: при переходе на другую оно закрывается само
  const [menuPath, setMenuPath] = useState(null)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const menuOpen = menuPath === pathname

  // фото мастера приходит только из профиля; если ещё не загружено, подтягиваем, чтобы шапка на сайте совпадала с панелью
  const needsAvatar = user?.role === 'Performer' && user.avatarUrl === undefined
  useEffect(() => {
    if (!needsAvatar) return
    getProfile()
      .then((p) => updateUser({ avatarUrl: p.avatarUrl ?? null, specialization: p.specialization }))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAvatar])

  const isMember = user?.role === 'Client' || user?.role === 'Performer'
  const closeMenu = () => setMenuPath(null)

  // меню закрывается по Escape
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMenuPath(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  return (
    <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
      <div className="container site-header-inner">
        <Link to="/" className="site-logo">
          <img src={logoSrc} alt="FixHub" />
        </Link>

        <nav className="site-nav">
          <NavLink to="/" end>Каталог</NavLink>
          <NavLink to="/how">Как это работает</NavLink>
        </nav>

        <div className="header-actions hdr-main">
          <ThemeToggle />
          {showCart && (
            <Link to="/favorites" className="cart-link fav-link" aria-label="Избранное">
              <Heart size={27} strokeWidth={1.8} />
              {favCount > 0 && (
                <span key={favCount} className="cart-badge">{favCount}</span>
              )}
            </Link>
          )}

          {showCart && (
            <Link to="/cart" className="cart-link" aria-label="Корзина">
              <ShoppingCart size={28} strokeWidth={1.8} />
              {count > 0 && (
                <span key={count} className="cart-badge">{count}</span>
              )}
            </Link>
          )}

          {(user?.role === 'Performer' || user?.role === 'Client') && <NotificationsBell />}

          {user?.role === 'Client' || user?.role === 'Performer' ? (
            <UserMenu />
          ) : user ? (
            <>
              <span className="user-name">{user.fullName}</span>
              {user.role === 'Admin' && (
                <Link to="/admin" className="btn btn-primary btn-sm">Админ-панель</Link>
              )}
              <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Войти</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Регистрация</Link>
            </>
          )}

          <button
            type="button" className="burger" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={menuOpen} onClick={() => setMenuPath((p) => (p === pathname ? null : pathname))}
          >
            {menuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Меню">
          {/* телефон: всё, что на компьютере спрятано в меню аватара, лежит здесь, в одном месте */}
          {isMember && (
            <>
              <div className="mn-user">
                <Avatar name={user.fullName} url={user.avatarUrl} size={44} />
                <div>
                  <div className="mn-user-name">{user.fullName}</div>
                  <div className="mn-user-role">{user.role === 'Performer' ? 'Мастер' : 'Клиент'}</div>
                </div>
              </div>

              {user.role === 'Performer' ? (
                <>
                  <NavLink to="/performer" end className="mn-link"><LayoutDashboard size={20} /> Панель мастера</NavLink>
                  <NavLink to="/performer/profile" className="mn-link"><User size={20} /> Профиль</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/orders" className="mn-link"><ClipboardList size={20} /> Мои заказы</NavLink>
                  <NavLink to="/requests" className="mn-link"><MessageSquareText size={20} /> Запросы цены</NavLink>
                  <NavLink to="/favorites" className="mn-link">
                    <Heart size={20} /> Избранное
                    {favCount > 0 && <span className="mn-count">{favCount}</span>}
                  </NavLink>
                  <NavLink to="/profile" className="mn-link"><User size={20} /> Профиль</NavLink>
                </>
              )}
              <div className="mn-sep" />
            </>
          )}

          <NavLink to="/" end>Каталог</NavLink>
          <NavLink to="/how">Как это работает</NavLink>
          <NavLink to="/about">О нас</NavLink>
          <NavLink to="/contacts">Контакты</NavLink>

          {isMember && (
            <>
              <div className="mn-sep" />
              <button type="button" className="mn-link mn-logout"
                onClick={() => { closeMenu(); logout(); navigate('/') }}>
                <LogOut size={20} /> Выйти
              </button>
            </>
          )}
        </nav>
      )}
    </header>
  )
}
