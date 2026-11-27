import { BadgeCheck, MessagesSquare, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Reveal from '../../components/common/Reveal'
import './StaticPages.css'

const VALUES = [
  { icon: <BadgeCheck size={22} />, title: 'Проверенные мастера', text: 'Профили мастеров проверяет администратор, а проверенные отмечены в каталоге специальным значком.' },
  { icon: <MessagesSquare size={22} />, title: 'Честные отзывы', text: 'Оставить отзыв можно только по выполненному заказу, поэтому рейтинг мастера отражает реальную работу.' },
  { icon: <ShieldCheck size={22} />, title: 'Понятные заявки', text: 'Цена указана в услуге, а статус заказа виден на каждом шаге: от заявки до выполнения.' },
]

export default function AboutPage() {
  return (
    <div className="container container--narrow ip">
      <header className="ip-head">
        <h1>О нас</h1>
        <p>
          FixHub - платформа, на которой удобно найти мастера или специалиста рядом с вами и договориться о работе без долгих поисков.
          Мы делаем так, чтобы заказать услугу было так же просто, как выбрать товар в магазине.
        </p>
      </header>

      <Reveal as="section" className="ip-block">
        <h2>На чём мы строим сервис</h2>
        <div className="ip-cards">
          {VALUES.map((v) => (
            <div className="ip-card" key={v.title}>
              <span className="ip-card-icon">{v.icon}</span>
              <b>{v.title}</b>
              <span>{v.text}</span>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal as="section" className="ip-block">
        <h2>Кому подходит FixHub</h2>
        <p style={{ margin: 0, maxWidth: 720, fontSize: 15, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          Клиентам, которым нужно починить технику, прибраться, сделать ремонт сантехники, найти репетитора или фотографа.
          И мастерам, которые хотят получать заявки, показывать свои услуги и накапливать рейтинг в одном месте.
        </p>
      </Reveal>

      <Reveal>
      <div className="ip-cta">
        <div>
          <h2>Посмотрите, что есть в каталоге</h2>
          <p>Услуги мастеров по категориям, с ценами и отзывами.</p>
        </div>
        <Link to="/" className="btn">Открыть каталог</Link>
      </div>
      </Reveal>
    </div>
  )
}
