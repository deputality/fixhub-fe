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

function Soon({ title }) {
  return (
    <div className="container soon">
      <h1>{title}</h1>
      <p>Эта страница появится на следующем этапе.</p>
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const isAuthPage = pathname === '/login' || pathname === '/register'

  // при переходе на другую страницу возвращаемся наверх
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="app-shell">
      {!isAuthPage && <Header />}

      <div className="app-main">
        <div key={isAuthPage ? 'auth' : pathname} className="page-fade">
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
          <Route path="/how" element={<Soon title="Как это работает" />} />
          <Route path="/about" element={<Soon title="О нас" />} />
          <Route path="/contacts" element={<Soon title="Контакты" />} />
        </Routes>
        </div>
      </div>

      {!isAuthPage && <Footer />}
      <ScrollTop />
    </div>
  )
}