import { Fragment, useState } from 'react'
import { ChevronDown, Star } from 'lucide-react'
import Button from './Button'
import PriceRange from './PriceRange'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

export default function Filters({ categories, bounds, applied, onApply, onReset }) {
  const [category, setCategory] = useState(applied.category)
  const [price, setPrice] = useState([
    applied.min !== '' ? clamp(Number(applied.min), bounds.min, bounds.max) : bounds.min,
    applied.max !== '' ? clamp(Number(applied.max), bounds.min, bounds.max) : bounds.max,
  ])
  const [rating, setRating] = useState(Number(applied.rating) || 0)

  const roots = categories.filter((c) => !c.parentId)
  const childrenOf = (id) => categories.filter((c) => c.parentId === id)

  function handleSubmit(e) {
    e.preventDefault()
    onApply({
      category,
      min: price[0] > bounds.min ? price[0] : '',
      max: price[1] < bounds.max ? price[1] : '',
      rating: rating || '',
    })
  }

  return (
    <form className="filters" onSubmit={handleSubmit}>
      <h2>Фильтры</h2>

      <div className="filter-group">
        <label htmlFor="f-category">Категория</label>
        <div className="select-wrap">
          <select id="f-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Все категории</option>
            {roots.map((root) => (
              <Fragment key={root.id}>
                <option value={root.id}>{root.name}</option>
                {childrenOf(root.id).map((child) => (
                  <option key={child.id} value={child.id}>— {child.name}</option>
                ))}
              </Fragment>
            ))}
          </select>
          <ChevronDown size={18} />
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Цена за услугу</span>
        <span className="filter-hint">от {price[0]} BYN до {price[1]} BYN</span>
        <PriceRange min={bounds.min} max={bounds.max} value={price} onChange={setPrice} />
        <div className="range-ends">
          <span>{bounds.min} BYN</span>
          <span>{bounds.max} BYN</span>
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label">Минимальный рейтинг</span>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="star-btn"
              aria-label={`Рейтинг от ${n}`}
              onClick={() => setRating(rating === n ? 0 : n)}
              style={{ color: n <= rating ? '#f59e0b' : '#cbd5e1' }}
            >
              <Star size={26} fill={n <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
          <span className="rating-value">{rating ? `от ${rating}.0` : 'Любой'}</span>
        </div>
      </div>

      <Button type="submit" block>Применить</Button>
      <button type="button" className="link-btn reset-btn" onClick={onReset}>
        Сбросить фильтры
      </button>
    </form>
  )
}