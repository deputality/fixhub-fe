import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import './DatePicker.css'

const GAP = 8
const EDGE = 12
const WIDTH = 304
const SHEET_QUERY = '(max-width: 560px)'
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const pad = (n) => String(n).padStart(2, '0')
const toIso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`

function parse(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null
}

function todayIso() {
  const t = new Date()
  return toIso(t.getFullYear(), t.getMonth(), t.getDate())
}

function formatShown(iso) {
  const p = parse(iso)
  return p ? `${pad(p.d)}.${pad(p.m + 1)}.${p.y}` : ''
}

// Календарь в стиле сайта вместо системного окна браузера (оно открывалось на английском).
// value и onChange работают со строкой 'ГГГГ-ММ-ДД', как у <input type="date">.
// min: самая ранняя дата, которую можно выбрать. clearable: показать кнопку «Очистить».
// Календарь выводится в <body> и позиционируется по экрану, поэтому окна и карточки его не обрезают.
// На телефоне вместо выпадашки показывается нижняя панель, как у Select.
export default function DatePicker({
  value, onChange, min, id, ariaLabel, placeholder = 'Выберите дату', clearable = false, className = '',
}) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [view, setView] = useState({ y: 2000, m: 0 })
  const [pos, setPos] = useState(null)

  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const popRef = useRef(null)
  const raf = useRef(0)

  const today = todayIso()
  const isBlocked = useCallback((iso) => Boolean(min) && iso < min, [min])

  const place = useCallback(() => {
    const trigger = triggerRef.current
    const pop = popRef.current
    if (!trigger || !pop) return
    const r = trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    if (r.bottom < 0 || r.top > vh) { setOpen(false); return }

    const left = Math.max(EDGE, Math.min(r.left, vw - WIDTH - EDGE))
    const below = vh - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const height = pop.offsetHeight
    const down = height <= below || below >= above

    setPos({
      left,
      top: down ? r.bottom + GAP : undefined,
      bottom: down ? undefined : vh - r.top + GAP,
      up: !down,
    })
  }, [])

  useLayoutEffect(() => {
    if (open && !sheet) place()
  }, [open, sheet, view, place])

  useEffect(() => {
    if (!open || sheet) return undefined
    const onMove = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(place)
    }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, sheet, place])

  useEffect(() => {
    if (!open) return undefined
    function onDown(e) {
      if (rootRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open || !sheet) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, sheet])

  // при открытии фокус уходит на выбранный (или сегодняшний) день, дальше работают стрелки
  useEffect(() => {
    if (!open) return
    const el = popRef.current?.querySelector('.dp-day.selected:not(:disabled), .dp-day.today:not(:disabled), .dp-day:not(:disabled)')
    el?.focus({ preventScroll: true })
    // только при открытии, а не при каждом листании месяца
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function openPicker() {
    const start = parse(value) ?? parse(min && min > today ? min : today)
    setView({ y: start.y, m: start.m })
    setSheet(window.matchMedia(SHEET_QUERY).matches)
    setPos(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function pick(iso) {
    if (isBlocked(iso)) return
    setOpen(false)
    if (iso !== value) onChange(iso)
    triggerRef.current?.focus()
  }

  function shift(delta) {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })
  }

  function onPopKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
      return
    }
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (step == null || !e.target.classList?.contains('dp-day')) return
    e.preventDefault()
    const days = [...popRef.current.querySelectorAll('.dp-day')]
    const next = days[days.indexOf(e.target) + step]
    if (next && !next.disabled) next.focus()
  }

  const first = new Date(view.y, view.m, 1)
  const offset = (first.getDay() + 6) % 7
  const count = new Date(view.y, view.m + 1, 0).getDate()
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)]
  const prevBlocked = Boolean(min) && toIso(view.y, view.m, 1) <= min

  const popStyle = sheet ? undefined : pos
    ? { left: pos.left, top: pos.top, bottom: pos.bottom }
    : { left: 0, top: 0, visibility: 'hidden' }

  return (
    <div ref={rootRef} className={`dp${open ? ' open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="dropdown-trigger dp-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openPicker())}
      >
        <Calendar size={18} />
        <span className={`dp-value${value ? '' : ' dp-placeholder'}`}>{value ? formatShown(value) : placeholder}</span>
        <ChevronDown size={18} />
      </button>

      {open && createPortal(
        <>
          {sheet && <div className="dropdown-backdrop" onMouseDown={() => setOpen(false)} />}
          <div
            ref={popRef}
            className={`dp-pop${sheet ? ' sheet' : ''}${pos?.up ? ' up' : ''}`}
            style={popStyle}
            role="dialog"
            aria-label={ariaLabel ?? 'Выбор даты'}
            onKeyDown={onPopKeyDown}
          >
            <div className="dp-head">
              <button type="button" className="dp-nav" aria-label="Предыдущий месяц" disabled={prevBlocked} onClick={() => shift(-1)}>
                <ChevronLeft size={18} />
              </button>
              <b>{MONTHS[view.m]} {view.y}</b>
              <button type="button" className="dp-nav" aria-label="Следующий месяц" onClick={() => shift(1)}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="dp-grid dp-weekdays" aria-hidden="true">
              {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
            </div>

            <div className="dp-grid">
              {cells.map((day, i) => {
                if (day == null) return <span key={`e${i}`} />
                const iso = toIso(view.y, view.m, day)
                const classes = ['dp-day']
                if (iso === value) classes.push('selected')
                if (iso === today) classes.push('today')
                return (
                  <button
                    key={iso}
                    type="button"
                    className={classes.join(' ')}
                    disabled={isBlocked(iso)}
                    aria-pressed={iso === value}
                    aria-label={`${day} ${MONTHS[view.m].toLowerCase()} ${view.y}`}
                    onClick={() => pick(iso)}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="dp-foot">
              {clearable && value
                ? <button type="button" onClick={() => { setOpen(false); onChange('') }}>Очистить</button>
                : <span />}
              <button type="button" disabled={isBlocked(today)} onClick={() => pick(today)}>Сегодня</button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}