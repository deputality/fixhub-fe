import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

const GAP = 8          // отступ меню от поля
const EDGE = 12        // минимальный отступ меню от края экрана
const SHEET_QUERY = '(max-width: 560px)'

// options: [{ value, label, depth? }]  depth > 0 — вложенный пункт (рисуется «веточкой»)
//
// Меню выводится в <body> и позиционируется по экрану (position: fixed), поэтому его не обрезают
// окна, карточки и таблицы с overflow. Оно раскрывается на всю высоту списка, открывается вверх,
// если снизу мало места, и скроллится только когда пунктов больше, чем влезает в экран.
// На телефоне вместо выпадашки показывается нижняя панель.
export default function Select({ value, onChange, options, id, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null)

  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const raf = useRef(0)
  const byKeyboard = useRef(true)
  const typed = useRef({ text: '', timer: 0 })
  const listId = useId()

  const selectedIndex = Math.max(0, options.findIndex((o) => String(o.value) === String(value)))
  const selected = options[selectedIndex]
  const hasTree = options.some((o) => o.depth)

  const close = useCallback(() => setOpen(false), [])

  // место под меню: снизу, а если там тесно и сверху просторнее — сверху
  const place = useCallback(() => {
    const trigger = triggerRef.current
    const menu = listRef.current
    if (!trigger || !menu) return
    const r = trigger.getBoundingClientRect()
    const vh = window.innerHeight

    // если поле уехало за экран, закрываем меню, чтобы оно не «висело» в воздухе
    if (r.bottom < 0 || r.top > vh) { setOpen(false); return }

    // меню не уже поля, но если подписи длиннее, расширяется (не выходя за экран)
    const vw = window.innerWidth
    const maxWidth = Math.min(Math.max(r.width, 360), vw - EDGE * 2)
    const width = Math.min(Math.max(r.width, menu.offsetWidth), maxWidth)
    const left = Math.max(EDGE, Math.min(r.left, vw - width - EDGE))

    const below = vh - r.bottom - GAP - EDGE
    const above = r.top - GAP - EDGE
    const natural = menu.scrollHeight + 2
    const down = natural <= below || below >= above

    setPos({
      left,
      minWidth: r.width,
      maxWidth,
      top: down ? r.bottom + GAP : undefined,
      bottom: down ? undefined : vh - r.top + GAP,
      maxHeight: Math.max(160, down ? below : above),
      up: !down,
    })
  }, [])

  useLayoutEffect(() => {
    if (open && !sheet) place()
  }, [open, sheet, options.length, place])

  // меню следует за полем при прокрутке и изменении размера окна
  useEffect(() => {
    if (!open || sheet) return
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

  // закрытие по клику снаружи (меню живёт в body, поэтому проверяем и его)
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (rootRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // при открытии нижней панели страница под ней не должна прокручиваться
  useEffect(() => {
    if (!open || !sheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open, sheet])

  // выбранный пункт при открытии и пункт под стрелками всегда видны; мышь список не двигает
  useEffect(() => {
    if (!open || !byKeyboard.current) return
    const list = listRef.current
    const el = list?.children[active]
    if (!el) return
    const top = el.offsetTop
    const bottom = top + el.offsetHeight
    if (top < list.scrollTop) list.scrollTop = Math.max(0, top - 8)
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 8
  }, [open, active, pos])

  function openList() {
    byKeyboard.current = true
    setSheet(window.matchMedia(SHEET_QUERY).matches)
    setActive(selectedIndex)
    setPos(null)
    setOpen(true)
  }

  function choose(index) {
    const option = options[index]
    setOpen(false)
    if (option && String(option.value) !== String(value)) onChange(option.value)
  }

  function move(index) {
    byKeyboard.current = true
    setActive(index)
  }

  // набор первых букв прыгает к подходящему пункту
  function typeAhead(char) {
    const t = typed.current
    clearTimeout(t.timer)
    t.text += char.toLowerCase()
    t.timer = setTimeout(() => { t.text = '' }, 600)
    const from = t.text.length > 1 ? active : active + 1
    const order = [...options.keys()].map((_, i) => (from + i) % options.length)
    const hit = order.find((i) => String(options[i].label).toLowerCase().startsWith(t.text))
    if (hit != null) move(hit)
  }

  function handleKeyDown(e) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(Math.min(active + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(Math.max(active - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      move(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      move(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape') {
      // Escape закрывает только список, а не окно, в котором он стоит
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    } else if (e.key === 'Tab') {
      setOpen(false)
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      typeAhead(e.key)
    }
  }

  const menuStyle = sheet ? undefined : pos
    ? { left: pos.left, minWidth: pos.minWidth, maxWidth: pos.maxWidth, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }
    : { left: 0, top: 0, visibility: 'hidden' }

  return (
    <div ref={rootRef} className={`dropdown${open ? ' open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className="dropdown-value">{selected?.label}</span>
        <ChevronDown size={18} />
      </button>

      {open && createPortal(
        <>
          {sheet && <div className="dropdown-backdrop" onMouseDown={close} />}
          <ul
            ref={listRef}
            id={listId}
            className={`dropdown-menu${sheet ? ' sheet' : ''}${pos?.up ? ' up' : ''}${hasTree ? ' tree' : ''}`}
            style={menuStyle}
            role="listbox"
            aria-label={ariaLabel}
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex
              return (
                <li
                  key={option.value}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  className={`dropdown-option${index === active ? ' active' : ''}${isSelected ? ' selected' : ''}${option.depth ? ' child' : ''}`}
                  onMouseMove={() => { if (index !== active) { byKeyboard.current = false; setActive(index) } }}
                  onClick={() => choose(index)}
                >
                  <span>{option.label}</span>
                  {isSelected && <span className="dropdown-check"><Check size={13} strokeWidth={3} /></span>}
                </li>
              )
            })}
          </ul>
        </>,
        document.body,
      )}
    </div>
  )
}
