import { Link } from 'react-router-dom'

const SOCIALS = [
  { name: 'ВКонтакте', src: '/social/vk.svg' },
  { name: 'Telegram', src: '/social/telegram.svg' },
  { name: 'YouTube', src: '/social/youtube.svg' },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <b>FixHub</b>
          <span>Удобные сервисы рядом с вами</span>
        </div>

        <nav className="footer-links">
          <Link to="/">Каталог</Link>
          <Link to="/how">Как это работает</Link>
          <Link to="/about">О нас</Link>
          <Link to="/contacts">Контакты</Link>
        </nav>

        <div className="socials">
          {SOCIALS.map((s) => (
            <a key={s.name} href="#" aria-label={s.name} onClick={(e) => e.preventDefault()}>
              <img src={s.src} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </a>
          ))}
        </div>
      </div>
      <div className="footer-copy">
        <div className="container">© {new Date().getFullYear()} FixHub. Все права защищены.</div>
      </div>
    </footer>
  )
}