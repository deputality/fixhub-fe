import { Link, NavLink } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

// если заменил логотип на SVG, поставь '/logo.svg'
const LOGO_SRC = '/logo.svg'

export default function Header() {
  const { user, logout } = useAuth()
  const { count } = useCart()
  const showCart = !user || user.role === 'Client'

  return (
    <header className="site-header">
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
              <ShoppingCart size={30} strokeWidth={1.8} />
              {count > 0 && <span className="cart-badge">{count}</span>}
            </Link>
          )}

          {user ? (
            <>
              <span className="user-name">{user.fullName}</span>
              <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Войти</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Регистрация</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}