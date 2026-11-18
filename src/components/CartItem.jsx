import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronDown, Minus, Plus, Star, Trash2, Wrench } from 'lucide-react'

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

function formatDate(iso) {
  const [y, m, d] = iso.split('-')
  return y && m && d ? `${d}.${m}.${y}` : 'Выберите дату'
}

export default function CartItem({ item, meta, minDate, removing, onQuantity, onField, onSave, onRemove }) {
  const [imageFailed, setImageFailed] = useState(false)
  const src = !imageFailed && (item.photoUrl || meta.image)
  const unit = UNITS[item.unit] ?? ''

  return (
    <article className={`cart-item${removing ? ' removing' : ''}`}>
      <Link to={`/services/${item.serviceId}`} className="cart-photo" style={{ '--cat': meta.color }}>
        {src ? (
          <img src={src} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <Wrench size={40} strokeWidth={1.6} />
        )}
      </Link>

      <div className="cart-info">
        <Link to={`/services/${item.serviceId}`} className="cart-title">{item.title}</Link>
        <div className="card-master">
          <span className="avatar">{initials(item.performerName)}</span>
          <div>
            <div className="master-name">{item.performerName}</div>
            <div className="master-role">Частный мастер</div>
          </div>
        </div>
        {item.rating != null && (
          <div className="cart-rating">
            <Star size={15} fill="#f59e0b" stroke="#f59e0b" />
            <b>{Number(item.rating).toFixed(1)}</b>
            <span>({item.reviewCount})</span>
          </div>
        )}
      </div>

      <div className="cart-controls">
        <div className="cart-row">
          <div className="cart-field">
            <span className="cart-label">Количество</span>
            <div className="stepper">
              <button
                type="button"
                aria-label="Уменьшить"
                disabled={item.quantity <= 1}
                onClick={() => onQuantity(item, -1)}
              >
                <Minus size={16} />
              </button>
              <span key={item.quantity} className="stepper-value">{item.quantity}</span>
              <button type="button" aria-label="Увеличить" onClick={() => onQuantity(item, 1)}>
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="cart-field grow">
            <span className="cart-label">Желаемая дата</span>
            <label className="date-box">
              <Calendar size={20} />
              <span>{formatDate(item.desiredDate)}</span>
              <ChevronDown size={18} />
              <input
                type="date"
                min={minDate}
                value={item.desiredDate}
                aria-label="Желаемая дата"
                onChange={(e) => {
                  onField(item.id, { desiredDate: e.target.value })
                  onSave({ ...item, desiredDate: e.target.value })
                }}
                onClick={(e) => { try { e.currentTarget.showPicker?.() } catch { /* не поддерживается */ } }}
              />
            </label>
          </div>
        </div>

        <div className="cart-field">
          <label className="cart-label" htmlFor={`comment-${item.id}`}>Комментарий (необязательно)</label>
          <textarea
            id={`comment-${item.id}`}
            className="cart-comment"
            rows={2}
            maxLength={500}
            placeholder="Что важно знать мастеру?"
            value={item.comment}
            onChange={(e) => onField(item.id, { comment: e.target.value })}
            onBlur={() => onSave(item)}
          />
        </div>
      </div>

      <div className="cart-side">
        <div className="cart-price">
          От {item.price} BYN{unit && <span>/{unit}</span>}
        </div>
        <button type="button" className="cart-remove" aria-label="Удалить из корзины" onClick={() => onRemove(item)}>
          <Trash2 size={22} />
        </button>
      </div>
    </article>
  )
}