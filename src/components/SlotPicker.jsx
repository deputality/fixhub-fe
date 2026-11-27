import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { getSlots } from '../api/schedule'
import './Features.css'

// Выбор времени у мастера с расписанием. Если расписания нет, ничего не показывает.
// onLoaded(hasSchedule) сообщает родителю, нужно ли время; value/onChange — выбранное 'HH:mm' или ''
export default function SlotPicker({ performerId, date, value, onChange, onLoaded }) {
  const [state, setState] = useState({ key: null, hasSchedule: false, slots: [], error: '' })
  const key = performerId && date ? `${performerId}|${date}` : null

  useEffect(() => {
    if (!key) return undefined
    let cancelled = false
    getSlots(performerId, date)
      .then((d) => {
        if (cancelled) return
        setState({ key, hasSchedule: d.hasSchedule, slots: d.slots ?? [], error: '' })
        onLoaded?.(d.hasSchedule)
        // выбранное время могло стать занятым или не существовать в этот день
        if (value && !(d.slots ?? []).some((s) => s.time === value && s.isFree)) onChange('')
      })
      .catch(() => {
        if (cancelled) return
        setState({ key, hasSchedule: false, slots: [], error: 'Не удалось загрузить время' })
      })
    return () => { cancelled = true }
    // value и колбэки намеренно не в зависимостях: слоты зависят только от мастера и даты
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!key) return null
  const loading = state.key !== key
  if (loading || !state.hasSchedule) {
    return state.error ? <div className="slot-note">{state.error}</div> : null
  }

  const free = state.slots.filter((s) => s.isFree).length

  return (
    <div className="slot-picker">
      <span className="slot-label"><Clock size={15} /> Время</span>
      {state.slots.length === 0 ? (
        <div className="slot-note">В этот день мастер не работает. Выберите другую дату.</div>
      ) : (
        <>
          <div className="slot-list" role="radiogroup" aria-label="Время">
            {state.slots.map((s) => (
              <button
                key={s.time}
                type="button"
                role="radio"
                aria-checked={value === s.time}
                disabled={!s.isFree}
                className={`slot-chip${value === s.time ? ' active' : ''}`}
                onClick={() => onChange(s.time)}
              >
                {s.time}
              </button>
            ))}
          </div>
          {free === 0 && <div className="slot-note">Все время на эту дату занято. Выберите другую дату.</div>}
        </>
      )}
    </div>
  )
}
