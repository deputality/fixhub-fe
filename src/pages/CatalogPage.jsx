import { useEffect, useState } from 'react'
import { api } from '../api/client'

const UNITS = { Hour: 'час', Piece: 'шт.' }

export default function CatalogPage() {
  const [items, setItems] = useState([])

  useEffect(() => {
    api('/api/catalog', { auth: false }).then((data) => setItems(data.items))
  }, [])

  return (
    <div className="page">
      <h1>Каталог услуг</h1>
      <ul>
        {items.map((s) => (
          <li key={s.id}>
            {s.title}: {s.price} BYN / {UNITS[s.unit]} ({s.performerName})
          </li>
        ))}
      </ul>
    </div>
  )
}