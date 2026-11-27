import { useState } from 'react'
import { Heart } from 'lucide-react'

// Сердечко «в избранное». variant="chip" — круглая кнопка поверх фото, "pill" — кнопка с подписью.
export default function FavoriteButton({ active, onToggle, label, variant = 'chip', className = '' }) {
  const [busy, setBusy] = useState(false)

  async function handleClick(e) {
    // кнопка лежит внутри ссылок-карточек: переходить по ссылке не нужно
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    await onToggle()
    setBusy(false)
  }

  const title = active ? 'Убрать из избранного' : 'В избранное'

  return (
    <button
      type="button"
      className={`fav-btn fav-${variant}${active ? ' on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={active}
      aria-label={label ? `${title}: ${label}` : title}
      title={title}
      disabled={busy}
      onClick={handleClick}
    >
      <Heart size={variant === 'pill' ? 18 : 19} strokeWidth={1.9} />
      {variant === 'pill' && <span>{active ? 'В избранном' : 'В избранное'}</span>}
    </button>
  )
}
