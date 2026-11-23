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
import AdminCategories from './pages/AdminCategories'
import AdminReviews from './pages/AdminReviews'
import AdminStats from './pages/AdminStats'
import AdminSettings from './pages/AdminSettings'
import PerformerLayout from './components/PerformerLayout'
import PerformerHome from './pages/PerformerHome'
import { PerformerOrdersPage, PerformerReviewsPage, PerformerServicesPage } from './pages/PerformerSections'
import ProfilePage from './pages/ProfilePage'
import PerformerProfilePage from './pages/PerformerProfilePage'
import OrderSentPage from './pages/OrderSentPage'
import PerformerPublicPage from './pages/PerformerPublicPage'
import HowItWorksPage from './pages/HowItWorksPage'
import AboutPage from './pages/AboutPage'
import ContactsPage from './pages/ContactsPage'
import NotFoundPage from './pages/NotFoundPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PerformerSettingsPage from './pages/PerformerSettingsPage'

export default function App() {
  const { pathname } = useLocation()
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password'].includes(pathname)
  // у админки свой layout с боковым меню, общая шапка и подвал не нужны
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/')
  // у панели мастера тоже свой layout: шапка и боковое меню внутри
  const isPerformerPage = pathname === '/performer' || pathname.startsWith('/performer/')
  const hideChrome = isAuthPage || isAdminPage || isPerformerPage

  // при переходе на другую страницу возвращаемся наверх
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  return (
    <div className="app-shell">
      {!hideChrome && <Header />}

      <div className="app-main">
        <div key={isAuthPage ? 'auth' : isAdminPage ? 'admin' : isPerformerPage ? 'performer' : pathname} className="page-fade">
        <Routes>
          <Route path="/" element={<CatalogPage />} />
          <Route path="/login" element={<AuthPage />} />
          <Route path="/register" element={<AuthPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/services/:id" element={<ServicePage />} />
          <Route path="/performers/:id" element={<PerformerPublicPage />} />
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
            <Route path="/cart/sent" element={<OrderSentPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route
            path="/performer"
            element={
              <ProtectedRoute roles={['Performer']}>
                <PerformerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PerformerHome />} />
            <Route path="services" element={<PerformerServicesPage />} />
            <Route path="orders" element={<PerformerOrdersPage />} />
            <Route path="reviews" element={<PerformerReviewsPage />} />
            <Route path="profile" element={<PerformerProfilePage />} />
            <Route path="settings" element={<PerformerSettingsPage />} />
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
            <Route path="categories" element={<AdminCategories />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="stats" element={<AdminStats />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          <Route path="/how" element={<HowItWorksPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </div>
      </div>

      {!hideChrome && <Footer />}
      <ScrollTop />
    </div>
  )
}