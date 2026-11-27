import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, CornerDownRight, X } from 'lucide-react'
import './Features.css'

function Viewer({ photos, index, onClose, onMove }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onMove(-1)
      if (e.key === 'ArrowRight') onMove(1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, onMove])

  return createPortal(
    <div className="pg-lb" role="dialog" aria-modal="true" aria-label="Фото из отзыва"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="pg-lb-close" aria-label="Закрыть" onClick={onClose}><X size={22} /></button>
      {photos.length > 1 && (
        <>
          <button type="button" className="pg-lb-nav prev" aria-label="Предыдущее фото" onClick={() => onMove(-1)}>
            <ChevronLeft size={26} />
          </button>
          <button type="button" className="pg-lb-nav next" aria-label="Следующее фото" onClick={() => onMove(1)}>
            <ChevronRight size={26} />
          </button>
        </>
      )}
      <figure className="pg-lb-body">
        <div className="pg-lb-pair single">
          <div className="pg-lb-shot"><img src={photos[index]} alt="" /></div>
        </div>
        {photos.length > 1 && <figcaption><small>{index + 1} из {photos.length}</small></figcaption>}
      </figure>
    </div>,
    document.body,
  )
}

// Миниатюры фото отзыва, по нажатию открывается просмотр
export function ReviewPhotos({ photos }) {
  const [open, setOpen] = useState(null)
  const move = useCallback((step) => {
    setOpen((i) => (i === null ? i : (i + step + photos.length) % photos.length))
  }, [photos.length])
  const close = useCallback(() => setOpen(null), [])

  if (!photos || photos.length === 0) return null
  return (
    <>
      <div className="rv-photos">
        {photos.map((url, i) => (
          <button key={url} type="button" className="rv-photo" aria-label={`Фото ${i + 1}`} onClick={() => setOpen(i)}>
            <img src={url} alt="" loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && <Viewer photos={photos} index={open} onClose={close} onMove={move} />}
    </>
  )
}

// Публичный ответ мастера под отзывом
export function ReviewReply({ review, performerName }) {
  if (!review.replyText) return null
  return (
    <div className="rv-reply">
      <div className="rv-reply-head">
        <CornerDownRight size={15} />
        <b>Ответ мастера{performerName ? `: ${performerName}` : ''}</b>
        {review.repliedAt && (
          <span>{new Date(review.repliedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        )}
      </div>
      <p>{review.replyText}</p>
    </div>
  )
}
