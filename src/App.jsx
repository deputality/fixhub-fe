import { Link, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import CatalogPage from './pages/CatalogPage'
import LoginPage from './pages/LoginPage'

function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="header">
      <Link to="/" className="logo">FixHub</Link>
      <nav>
        {user ? (
          <>
            <span>{user.fullName} ({user.role})</span>
            <button className="link-btn" onClick={logout}>Выйти</button>
          </>
        ) : (
          <Link to="/login">Войти</Link>
        )}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<div className="page">Регистрация скоро</div>} />
      </Routes>
    </>
  )
}