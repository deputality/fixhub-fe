import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import Header from './components/Header'
import ScrollTop from './components/ScrollTop'
import ProtectedRoute from './routes/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import CartPage from './pages/CartPage'
import CatalogPage from './pages/CatalogPage'
import ServicePage from './pages/ServicePage'
import OrdersPage from './pages/OrdersPage'
import CabinetLayout from './components/CabinetLayout'
import AdminLayout from './components/AdminLayout'
import AdminPage from './pages/AdminPage'

function Soon({ title }) {
  return (
    <div className="container soon">
      <h1>{title}</h1>
      <p>Эта страница появится на следующем этапе.</p>
    </div>
  )
}

function AdminSoon({ title }) {
  return (
    <div className="admin-soon">
      <h1>{title}</h1>
      <p>Этот раздел появится на следующем этапе.</p>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'
  // у админки свой layout с боковым меню, общая шапка и подвал не нужны
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  const hideChrome = isAuthPage || isAdminPage

  // при переходе на другую страницу возвращаемся наверх
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="app-shell">
      {!hideChrome && <Header />}

      <div className="app-main">
        <div key={isAuthPage ? 'auth' : isAdminPage ? 'admin' : pathname} className="page-fade">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/services/:id" element={<ServicePage />} />
          <Route
            path="/cart"
            element={
              <ProtectedRoute roles={['Client']}>
                <CartPage />
              </ProtectedRoute>
            }
          />
          <Route
            element={
              <ProtectedRoute roles={['Client']}>
                <CabinetLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/profile" element={<Soon title="Профиль" />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['Admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminPage />} />
            <Route path="categories" element={<AdminSoon title="Категории" />} />
            <Route path="reviews" element={<AdminSoon title="Отзывы" />} />
            <Route path="stats" element={<AdminSoon title="Статистика" />} />
            <Route path="settings" element={<AdminSoon title="Настройки" />} />
          </Route>
          <Route path="/how" element={<Soon title="Как это работает" />} />
          <Route path="/about" element={<Soon title="О нас" />} />
          <Route path="/contacts" element={<Soon title="Контакты" />} />
        </Routes>
        </div>
      </div>

      {!hideChrome && <Footer />}
      <ScrollTop />
    </div>
  )
}