export default function PriceRange({ min, max, value, onChange }) {
  const [from, to] = value
  const span = max - min || 1
  const left = ((from - min) / span) * 100
  const right = ((to - min) / span) * 100

  return (
    <div className="range">
      <div className="range-track">
        <div className="range-fill" style={{ left: `${left}%`, width: `${right - left}%` }} />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={from}
        aria-label="Минимальная цена"
        style={{ zIndex: from > (min + max) / 2 ? 5 : 3 }}
        onChange={(e) => onChange([Math.min(Number(e.target.value), to), to])}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={to}
        aria-label="Максимальная цена"
        style={{ zIndex: 4 }}
        onChange={(e) => onChange([from, Math.max(Number(e.target.value), from)])}
      />
    </div>
  )
}