import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, Images, X } from 'lucide-react'
import './PortfolioGallery.css'

// Одна работа: «до» и «после» рядом. Если «до» нет, показываем только результат.
export function PortfolioPair({ item, onOpen }) {
  return (
    <button type="button" className="pg-item" onClick={onOpen} aria-label={`Открыть работу: ${item.title}`}>
      <span className={`pg-pair${item.beforeUrl ? '' : ' single'}`}>
        {item.beforeUrl && (
          <span className="pg-shot">
            <img src={item.beforeUrl} alt="" loading="lazy" />
            <i>До</i>
          </span>
        )}
        <span className="pg-shot">
          <img src={item.afterUrl} alt="" loading="lazy" />
          {item.beforeUrl && <i className="after">После</i>}
        </span>
      </span>
      <span className="pg-caption">
        <b>{item.title}</b>
        {item.description && <span>{item.description}</span>}
      </span>
    </button>
  )
}

function Lightbox({ items, index, onClose, onMove }) {
  const item = items[index]

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
    <div className="pg-lb" role="dialog" aria-modal="true" aria-label={item.title}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="pg-lb-close" aria-label="Закрыть" onClick={onClose}><X size={22} /></button>

      {items.length > 1 && (
        <>
          <button type="button" className="pg-lb-nav prev" aria-label="Предыдущая работа" onClick={() => onMove(-1)}>
            <ChevronLeft size={26} />
          </button>
          <button type="button" className="pg-lb-nav next" aria-label="Следующая работа" onClick={() => onMove(1)}>
            <ChevronRight size={26} />
          </button>
        </>
      )}

      <figure className="pg-lb-body">
        <div className={`pg-lb-pair${item.beforeUrl ? '' : ' single'}`}>
          {item.beforeUrl && (
            <div className="pg-lb-shot"><img src={item.beforeUrl} alt={`${item.title}: до`} /><i>До</i></div>
          )}
          <div className="pg-lb-shot">
            <img src={item.afterUrl} alt={`${item.title}: ${item.beforeUrl ? 'после' : 'результат'}`} />
            {item.beforeUrl && <i className="after">После</i>}
          </div>
        </div>
        <figcaption>
          <b>{item.title}</b>
          {item.description && <span>{item.description}</span>}
          {items.length > 1 && <small>{index + 1} из {items.length}</small>}
        </figcaption>
      </figure>
    </div>,
    document.body,
  )
}

// Галерея работ на публичной странице мастера
export default function PortfolioGallery({ items }) {
  const [open, setOpen] = useState(null)

  const move = useCallback((step) => {
    setOpen((i) => (i === null ? i : (i + step + items.length) % items.length))
  }, [items.length])

  const close = useCallback(() => setOpen(null), [])

  return (
    <section className="mp-portfolio">
      <h2><Images size={20} /> Работы мастера<span>{items.length}</span></h2>
      <div className="pg-grid">
        {items.map((item, i) => (
          <PortfolioPair key={item.id} item={item} onOpen={() => setOpen(i)} />
        ))}
      </div>
      {open !== null && items[open] && (
        <Lightbox items={items} index={open} onClose={close} onMove={move} />
      )}
    </section>
  )
}
