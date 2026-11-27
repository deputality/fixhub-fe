import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck, Check, MapPin, ShoppingCart, Sparkles, Star } from 'lucide-react'
import { useFavorites } from '../../context/FavoritesContext'
import { formatDistance } from '../../utils/geo'
import FavoriteButton from './FavoriteButton'

const UNITS = { Hour: 'час', Piece: 'шт.' }

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

// hideMaster: на странице самого мастера его данные в карточке не повторяем
export default function ServiceCard({ service, meta, index, onAdd, hideMaster = false }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [added, setAdded] = useState(false)
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)
  const { serviceIds, toggleService } = useFavorites()

  useEffect(() => () => clearTimeout(timer.current), [])

  const src = !imageFailed && (service.photoUrl || meta.image)
  const Icon = meta.icon
  const link = `/services/${service.id}`

  async function handleAdd() {
    if (busy) return
    setBusy(true)
    const ok = await onAdd(service.id)
    setBusy(false)
    if (ok) {
      setAdded(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setAdded(false), 1800)
    }
  }

  return (
    <article className="card" style={{ animationDelay: `${index * 70}ms` }}>
      <Link to={link} className="card-photo" style={{ '--cat': meta.color }} aria-label={service.title}>
        {src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            className={imageLoaded ? 'loaded' : ''}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <Icon size={46} strokeWidth={1.6} />
        )}

        <span className="card-pill">
          {service.rating != null ? (
            <>
              <Star size={14} fill="#f59e0b" stroke="#f59e0b" />
              <b>{Number(service.rating).toFixed(1)}</b>
              <span>({service.reviewCount})</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <b>Новая</b>
            </>
          )}
        </span>
      </Link>

      <FavoriteButton
        className="card-fav"
        active={serviceIds.has(service.id)}
        label={service.title}
        onToggle={() => toggleService(service.id)}
      />

      <div className="card-body">
        <Link to={link} className="card-title">{service.title}</Link>

        {!hideMaster && (
          <Link to={`/performers/${service.performerId}`} className="card-master" aria-label={`Профиль мастера ${service.performerName}`}>
            <span className="avatar">
              {service.performerAvatarUrl
                ? <img src={service.performerAvatarUrl} alt="" />
                : initials(service.performerName)}
            </span>
            <div>
              <div className="master-name">
                {service.performerName}
                {service.performerIsVerified && (
                  <BadgeCheck size={15} className="master-ok" aria-label="Проверенный мастер" />
                )}
              </div>
              <div className="master-role">
                {service.performerSpecialization || 'Частный мастер'}
                {service.performerCity && ` · ${service.performerCity}`}
              </div>
              {service.distanceKm != null && (
                <div className="master-dist"><MapPin size={11} /> {formatDistance(service.distanceKm)} от вас</div>
              )}
            </div>
          </Link>
        )}

        <div className="card-bottom">
          <div className="card-price">
            <small>от</small> {service.price} BYN
            <span>/{UNITS[service.unit] ?? ''}</span>
          </div>

          <button
            type="button"
            className={`btn-cart${added ? ' added' : ''}`}
            onClick={handleAdd}
            disabled={busy}
          >
            <span className="btn-cart-icon">
              {added ? <Check size={16} /> : <ShoppingCart size={16} />}
            </span>
            {added ? 'Добавлено' : 'В корзину'}
          </button>
        </div>
      </div>
    </article>
  )
}