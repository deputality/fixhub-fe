import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CircleAlert, MapPin, Phone, User, Zap } from 'lucide-react'
import { quickOrder } from '../api/orders'
import { useAuth } from '../context/AuthContext'
import { useAuthGuard } from '../utils/useAuthGuard'
import { validateContact } from '../utils/contactForm'
import Button from './Button'
import Input from './Input'
import Modal from './Modal'
import './QuickOrderModal.css'

const UNITS = { Hour: 'час', Piece: 'шт.' }

function formatDate(iso) {
  if (!iso) return 'не указана'
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// «Заказать» без корзины: одна услуга и контакты в одном окне.
// service, quantity, date, comment приходят со страницы услуги
export default function QuickOrderModal({ service, quantity, date, comment, photo, color, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const guard = useAuthGuard()

  const [name, setName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [address, setAddress] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const total = service.price * quantity

  function bind(setter, key) {
    return (e) => {
      setter(e.target.value)
      setFormError('')
      setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    const found = validateContact({ name, address, phone })
    setErrors(found)
    const first = ['address', 'phone', 'name'].find((k) => found[k])
    if (first) {
      document.getElementById(`quick-${first}`)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const contact = { name: name.trim(), phone: phone.trim(), address: address.trim() }
      const order = await quickOrder({
        serviceId: service.id,
        quantity,
        desiredDate: date || null,
        comment: comment || null,
        address: contact.address,
        contactName: contact.name,
        contactPhone: contact.phone,
      })
      // та же страница «Заявка отправлена», что и после корзины
      navigate('/cart/sent', {
        replace: true,
        state: {
          orders: [order],
          contact,
          services: [{ serviceId: service.id, unit: service.unit, photo, color }],
        },
      })
    } catch (err) {
      if (guard(err)) return
      const msg = err?.errors ? Object.values(err.errors).flat()[0] : err?.error
      setFormError(msg ?? 'Не удалось отправить заказ. Попробуйте ещё раз')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Заказать услугу" onClose={onClose}>
      <form className="quick-order" onSubmit={handleSubmit} noValidate>
        <div className="quick-summary">
          <b>{service.title}</b>
          <span>{service.performerName}</span>
          <span>
            {quantity} × {service.price} BYN{UNITS[service.unit] && ` / ${UNITS[service.unit]}`}
            {' · '}дата: {formatDate(date)}
          </span>
          <div className="quick-total">Итого <b>{total} BYN</b></div>
        </div>

        <Input
          id="quick-address"
          label="Адрес"
          icon={<MapPin size={20} />}
          placeholder="Ул. Ленина, д.10, кв.25"
          value={address}
          onChange={bind(setAddress, 'address')}
          error={errors.address}
          maxLength={300}
          autoComplete="street-address"
        />
        <Input
          id="quick-phone"
          type="tel"
          label="Телефон"
          icon={<Phone size={20} />}
          placeholder="+375 (29) 857-17-12"
          value={phone}
          onChange={bind(setPhone, 'phone')}
          error={errors.phone}
          maxLength={25}
          autoComplete="tel"
        />
        <Input
          id="quick-name"
          label="Имя"
          icon={<User size={20} />}
          placeholder="Иван Петров"
          value={name}
          onChange={bind(setName, 'name')}
          error={errors.name}
          maxLength={200}
          autoComplete="name"
        />

        {formError && (
          <div className="form-alert" role="alert">
            <CircleAlert size={18} />
            <span>{formError}</span>
          </div>
        )}

        <Button type="submit" block loading={submitting}>
          <Zap size={18} /> {submitting ? 'Подождите' : 'Отправить заказ'}
        </Button>
        <p className="quick-note">Корзина не используется: заказ уйдёт мастеру сразу.</p>
      </form>
    </Modal>
  )
}
