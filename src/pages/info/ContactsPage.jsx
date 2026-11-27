import { Clock, Mail, MapPin, Phone } from 'lucide-react'
import Reveal from '../../components/common/Reveal'
import './StaticPages.css'

// Замените на реальные контакты проекта
const CONTACTS = {
  email: 'support@fixhub.example',
  phone: '+375 (29) 000-00-00',
  address: 'г. Минск, ул. Примерная, 1',
  hours: 'Пн-Пт, 9:00-18:00',
}

export default function ContactsPage() {
  const tel = CONTACTS.phone.replace(/[^\d+]/g, '')

  return (
    <div className="container container--narrow ip">
      <header className="ip-head">
        <h1>Контакты</h1>
        <p>Есть вопрос по заказу, работе сайта или вы хотите предложить идею? Напишите или позвоните нам.</p>
      </header>

      <Reveal className="ip-contacts">
      <div className="ip-cards two">
        <div className="ip-card">
          <span className="ip-card-icon"><Mail size={22} /></span>
          <b>Электронная почта</b>
          <a href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a>
        </div>
        <div className="ip-card">
          <span className="ip-card-icon"><Phone size={22} /></span>
          <b>Телефон</b>
          <a href={`tel:${tel}`}>{CONTACTS.phone}</a>
        </div>
        <div className="ip-card">
          <span className="ip-card-icon"><MapPin size={22} /></span>
          <b>Адрес</b>
          <span>{CONTACTS.address}</span>
        </div>
        <div className="ip-card">
          <span className="ip-card-icon"><Clock size={22} /></span>
          <b>Время работы</b>
          <span>{CONTACTS.hours}</span>
        </div>
      </div>

      </Reveal>
      <Reveal>
      <p className="ip-note">Вопрос по конкретному заказу? Укажите в письме его номер, так мы ответим быстрее.</p>
      </Reveal>
    </div>
  )
}
