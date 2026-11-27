import { useRef, useState } from 'react'
import { searchPlaces } from '../../utils/geocode'
import './MapSearch.css'

// Строка поиска места: onSelect({ lat, lng, label }) вызывается, когда человек выбрал вариант.
// Ищем по всему миру. Если вариант один, он выбирается сразу; если несколько, показываем список с областью и страной.
export default function MapSearch({ onSelect, inputClassName = '', placeholder = 'Найти город, например Брест' }) {
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState([])
  const [state, setState] = useState('idle') // idle | loading | empty | error
  const abortRef = useRef(null)

  async function run() {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState('loading')
    setOptions([])
    try {
      const found = await searchPlaces(query, { signal: ctrl.signal })
      if (found.length === 0) return setState('empty')
      if (found.length === 1) {
        setState('idle')
        choose(found[0])
        return
      }
      setOptions(found)
      setState('idle')
    } catch (e) {
      if (e.name !== 'AbortError') setState('error')
    }
  }

  function choose(place) {
    setOptions([])
    setQuery(place.label)
    onSelect?.(place)
  }

  function submit(e) {
    e.preventDefault()
    e.stopPropagation()
    run()
  }

  return (
    <div className="map-search">
      <div className="map-search-row">
        <input
          className={inputClassName}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(e) }}
          placeholder={placeholder}
          aria-label="Поиск места на карте"
        />
        <button type="button" className="map-search-btn" onClick={submit} disabled={state === 'loading'}>
          {state === 'loading' ? 'Ищем…' : 'Найти'}
        </button>
      </div>

      {options.length > 0 && (
        <ul className="map-search-list" role="listbox">
          {options.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => choose(o)}>{o.label}</button>
            </li>
          ))}
        </ul>
      )}

      {state === 'empty' && (
        <p className="map-search-note">Не нашли «{query.trim()}». Проверьте название или поставьте точку кликом по карте.</p>
      )}
      {state === 'error' && <p className="map-search-note">Поиск места сейчас недоступен. Поставьте точку кликом по карте.</p>}
    </div>
  )
}