import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, CircleAlert, Lock, MapPin, Phone, ShoppingCart, User } from 'lucide-react'
import { createOrder, getCart, normalizeItem, removeCartItem, updateCartItem } from '../api/cart'
import { getCategories } from '../api/catalog'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import Button from '../components/Button'
import CartItem from '../components/CartItem'
import Input from '../components/Input'
import './CartPage.css'

const MAX_QTY = 99

function pluralServices(n) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} услуга`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} услуги`
  return `${n} услуг`
}

function todayIso() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function validate({ name, address, phone }) {
  const errors = {}
  if (!address.trim()) errors.address = 'Введите адрес'
  const digits = phone.replace(/\D/g, '')
  if (!phone.trim()) errors.phone = 'Введите телефон'
  else if (digits.length < 9 || digits.length > 12) errors.phone = 'Введите корректный номер, например +375 29 857 17 12'
  if (!name.trim()) errors.name = 'Введите имя'
  return errors
}

export default function CartPage() {
  const { user, logout } = useAuth()
  const { setCount } = useCart()
  const { show } = useToast()
  const navigate = useNavigate()

  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [categories, setCategories] = useState([])
  const [removingId, setRemovingId] = useState(null)

  const [name, setName] = useState(user?.fullName ?? '')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const minDate = useMemo(todayIso, [])

  // свежие значения для обработчиков без лишних зависимостей эффекта
  const live = useRef({})
  useEffect(() => {
    live.current = { logout, navigate, show, setCount }
  })

  function handleAuthError(err) {
    if (err?.status !== 401) return false
    live.current.logout()
    live.current.show('Сессия истекла, войдите снова', 'error')
    live.current.navigate('/login')
    return true
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([getCart(), getCategories().catch(() => [])])
      .then(([cart, cats]) => {
        if (cancelled) return
        setCategories(cats)
        const items = (cart.items ?? []).map(normalizeItem)
        live.current.setCount(items.length)
        setState({ status: 'ready', items, error: '' })
      })
      .catch((err) => {
        if (cancelled) return
        if (handleAuthError(err)) return
        setState({ status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить корзину' })
      })
    return () => { cancelled = true }
  }, [])

  const byId = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories])
  const { items } = state

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  )

  function patchItem(id, changes) {
    setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }))
  }

  async function saveItem(item) {
    try {
      await updateCartItem(item.id, {
        quantity: item.quantity,
        comment: item.comment,
        desiredDate: item.desiredDate || null,
      })
    } catch (err) {
      if (handleAuthError(err)) return
      show(err?.error ?? 'Не удалось сохранить изменения', 'error')
    }
  }

  async function changeQuantity(item, delta) {
    const next = Math.min(Math.max(item.quantity + delta, 1), MAX_QTY)
    if (next === item.quantity) return
    patchItem(item.id, { quantity: next })
    try {
      await updateCartItem(item.id, {
        quantity: next,
        comment: item.comment,
        desiredDate: item.desiredDate || null,
      })
    } catch (err) {
      patchItem(item.id, { quantity: item.quantity })
      if (handleAuthError(err)) return
      show(err?.error ?? 'Не удалось изменить количество', 'error')
    }
  }

  async function removeItem(item) {
    setRemovingId(item.id)
    try {
      await removeCartItem(item.id)
      setTimeout(() => {
        setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }))
        setCount(items.length - 1)
        setRemovingId(null)
      }, 260)
      show('Услуга удалена из корзины')
    } catch (err) {
      setRemovingId(null)
      if (handleAuthError(err)) return
      show(err?.error ?? 'Не удалось удалить услугу', 'error')
    }
  }

  function handleChange(setter, key) {
    return (e) => {
      setter(e.target.value)
      setFormError('')
      setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const errors = validate({ name, address, phone })
    setFieldErrors(errors)
    const first = ['address', 'phone', 'name'].find((k) => errors[k])
    if (first) {
      document.getElementById(`order-${first}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await createOrder({
        address: address.trim(),
        phone: phone.trim(),
        customerName: name.trim(),
      })
      setCount(0)
      show('Заказ оформлен')
      navigate('/')
    } catch (err) {
      if (handleAuthError(err)) return
      setFormError(err?.error ?? 'Не удалось оформить заказ. Попробуйте ещё раз')
    } finally {
      setSubmitting(false)
    }
  }

  let list
  if (state.status === 'loading') {
    list = (
      <div className="cart-list" aria-hidden="true">
        {[0, 1].map((i) => (
          <div key={i} className="cart-item">
            <div className="skeleton cart-sk-photo" />
            <div className="cart-sk-body">
              <div className="skeleton sk-line" />
              <div className="skeleton sk-line short" />
              <div className="skeleton sk-line tiny" />
            </div>
          </div>
        ))}
      </div>
    )
  } else if (state.status === 'error') {
    list = (
      <div className="form-alert" role="alert">
        <CircleAlert size={18} />
        <span>{state.error}. Проверьте, что бэкенд запущен, и обновите страницу.</span>
      </div>
    )
  } else if (items.length === 0) {
    list = (
      <div className="empty cart-empty">
        <ShoppingCart size={46} strokeWidth={1.5} />
        <h3>Корзина пуста</h3>
        <p>Добавьте услуги из каталога, чтобы оформить заказ</p>
        <Link to="/" className="btn btn-primary btn-sm">Перейти в каталог</Link>
      </div>
    )
  } else {
    list = (
      <div className="cart-list">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            meta={resolveCategoryMeta(item.categoryId, byId)}
            minDate={minDate}
            removing={removingId === item.id}
            onQuantity={changeQuantity}
            onField={patchItem}
            onSave={saveItem}
            onRemove={removeItem}
          />
        ))}
      </div>
    )
  }

  const hasItems = state.status === 'ready' && items.length > 0

  return (
    <div className="container cart-page">
      <h1 className="cart-heading">Корзина</h1>
      <p className="cart-sub">Проверьте выбранные услуги и оформите заказ</p>

      <div className="cart-layout">
        <section className="cart-panel">
          {list}
          <Link to="/" className="cart-back">
            <ChevronLeft size={18} /> Продолжить покупки
          </Link>
        </section>

        {hasItems && (
          <aside>
            <form className="cart-summary" onSubmit={handleSubmit} noValidate>
              <h2>Итого</h2>
              <div key={total} className="summary-total">{total} BYN</div>
              <div className="summary-line">
                <span>{pluralServices(items.length)}</span>
                <span>{total} BYN</span>
              </div>

              <h2 className="summary-title">Оформление заказа</h2>
              <div className="summary-fields">
                <Input
                  id="order-address"
                  label="Адрес"
                  icon={<MapPin size={20} />}
                  placeholder="Ул. Ленина, д.10, кв.25"
                  value={address}
                  onChange={handleChange(setAddress, 'address')}
                  error={fieldErrors.address}
                  maxLength={300}
                  autoComplete="street-address"
                />
                <Input
                  id="order-phone"
                  type="tel"
                  label="Телефон"
                  icon={<Phone size={20} />}
                  placeholder="+375 (29) 857-17-12"
                  value={phone}
                  onChange={handleChange(setPhone, 'phone')}
                  error={fieldErrors.phone}
                  maxLength={25}
                  autoComplete="tel"
                />
                <Input
                  id="order-name"
                  label="Имя"
                  icon={<User size={20} />}
                  placeholder="Иван Петров"
                  value={name}
                  onChange={handleChange(setName, 'name')}
                  error={fieldErrors.name}
                  maxLength={200}
                  autoComplete="name"
                />
              </div>

              {formError && (
                <div className="form-alert" role="alert">
                  <CircleAlert size={18} />
                  <span>{formError}</span>
                </div>
              )}

              <Button type="submit" block loading={submitting}>
                {submitting ? 'Подождите' : 'Оформить заказ'}
              </Button>
              <p className="summary-safe"><Lock size={18} /> Ваши данные защищены</p>
            </form>
          </aside>
        )}
      </div>
    </div>
  )
}