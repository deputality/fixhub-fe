import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, ShoppingCart, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import UserMenu from './UserMenu'

// если заменил логотип на SVG, поставь '/logo.svg'
const LOGO_SRC = '/logo.svg'

export default function Header() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const showCart = !user || user.role === 'Client'
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()

  // меню закрывается при переходе на другую страницу и по Escape
  useEffect(() => setMenuOpen(false), [pathname])
  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
            <Link to="/cart" className="cart-link" aria-label="Корзина">
              <ShoppingCart size={28} strokeWidth={1.8} />
              {count > 0 && (
                <span key={count} className="cart-badge">{count}</span>
              )}
            </Link>
          )}

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
            aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}
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