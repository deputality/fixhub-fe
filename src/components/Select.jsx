import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

// options: [{ value, label, depth? }]  depth > 0 — вложенный пункт (отступ)
export default function Select({ value, onChange, options, id, ariaLabel, className = '' }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const listId = useId()

  const selectedIndex = Math.max(0, options.findIndex((o) => String(o.value) === String(value)))
  const selected = options[selectedIndex]

  // закрытие по клику снаружи
  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // подсвеченный пункт всегда виден в списке
  useEffect(() => {
    if (!open) return
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function openList() {
    setActive(selectedIndex)
    setOpen(true)
  }

  function choose(index) {
    const option = options[index]
    setOpen(false)
    if (option && String(option.value) !== String(value)) onChange(option.value)
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
      setActive((i) => Math.min(i + 1, options.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      choose(active)
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className={`dropdown${open ? ' open' : ''} ${className}`}>
      <button
        type="button"
        id={id}
        className="dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
      >
        <span className="dropdown-value">{selected?.label}</span>
        <ChevronDown size={18} />
      </button>

      {open && (
        <ul ref={listRef} id={listId} className="dropdown-menu" role="listbox">
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`dropdown-option${index === active ? ' active' : ''}${isSelected ? ' selected' : ''}${option.depth ? ' child' : ''}`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {isSelected && <Check size={16} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}