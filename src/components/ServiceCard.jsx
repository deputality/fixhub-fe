import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Star } from 'lucide-react'

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

export default function ServiceCard({ service, meta, index, onAdd }) {
  const [imageFailed, setImageFailed] = useState(false)
  const src = !imageFailed && (service.photoUrl || meta.image)
  const Icon = meta.icon
  const link = `/services/${service.id}`

  return (
    <article className="card" style={{ animationDelay: `${index * 50}ms` }}>
      <Link to={link} className="card-photo" style={{ '--cat': meta.color }} aria-label={service.title}>
        {src ? (
          <img src={src} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <Icon size={46} strokeWidth={1.6} />
        )}
      </Link>

      <div className="card-body">
        <Link to={link} className="card-title">{service.title}</Link>

        <div className="card-master">
          <span className="avatar">{initials(service.performerName)}</span>
          <div>
            <div className="master-name">{service.performerName}</div>
            <div className="master-role">Частный мастер</div>
          </div>
        </div>

        <div className="card-bottom">
          <div>
            <div className="card-rating">
              {service.rating != null ? (
                <>
                  <Star size={16} fill="#f59e0b" stroke="#f59e0b" />
                  <b>{Number(service.rating).toFixed(1)}</b>
                  <span>({service.reviewCount})</span>
                </>
              ) : (
                <span className="no-rating">Нет отзывов</span>
              )}
            </div>
            <div className="card-price">от {service.price} BYN/{UNITS[service.unit] ?? ''}</div>
          </div>

          <button type="button" className="btn-cart" onClick={() => onAdd(service.id)}>
            <ShoppingCart size={16} />
            В корзину
          </button>
        </div>
      </div>
    </article>
  )
}