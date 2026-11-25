import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Heart, Menu, ShoppingCart, X } from 'lucide-react'
import { getProfile } from '../api/profile'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useFavorites } from '../context/FavoritesContext'
import { LOGO_SRC } from '../utils/brand'
import { useScrolled } from '../utils/useScrolled'
import NotificationsBell from './NotificationsBell'
import UserMenu from './UserMenu'

export default function Header() {
  const { user, logout, updateUser } = useAuth()
  const { count } = useCart()
  const { count: favCount } = useFavorites()
  const showCart = !user || user.role === 'Client'
  const scrolled = useScrolled()
  // запоминаем, на какой странице открыто меню: при переходе на другую оно закрывается само
  const [menuPath, setMenuPath] = useState(null)
  const { pathname } = useLocation()
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
          <img src={LOGO_SRC} alt="FixHub" />
        </Link>

        <nav className="site-nav">
          <NavLink to="/" end>Каталог</NavLink>
          <NavLink to="/how">Как это работает</NavLink>
        </nav>

        <div className="header-actions">
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

          {user?.role === 'Performer' && <NotificationsBell />}

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
          <NavLink to="/" end>Каталог</NavLink>
          <NavLink to="/how">Как это работает</NavLink>
          <NavLink to="/about">О нас</NavLink>
          <NavLink to="/contacts">Контакты</NavLink>
        </nav>
      )}
    </header>
  )
}