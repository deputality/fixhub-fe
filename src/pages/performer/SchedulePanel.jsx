import { useEffect, useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { getMySchedule, saveMySchedule } from '../../api/schedule'
import { useToast } from '../../context/ToastContext'
import { useAuthGuard } from '../../utils/useAuthGuard'
import Button from '../../components/common/Button'
import Select from '../../components/common/Select'
import '../../components/common/Features.css'

const DAYS = [
  { n: 1, label: 'Понедельник' }, { n: 2, label: 'Вторник' }, { n: 3, label: 'Среда' },
  { n: 4, label: 'Четверг' }, { n: 5, label: 'Пятница' }, { n: 6, label: 'Суббота' }, { n: 7, label: 'Воскресенье' },
]

const pad = (h) => `${String(h).padStart(2, '0')}:00`
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => pad(from + i))
const START_OPTIONS = range(6, 22)
const END_OPTIONS = range(7, 23)

const emptyWeek = () => Object.fromEntries(DAYS.map((d) => [d.n, { on: false, start: '09:00', end: '18:00' }]))

function options(list, current) {
  return list.includes(current) ? list : [...list, current].sort()
}

export default function SchedulePanel() {
  const guard = useAuthGuard()
  const { show } = useToast()
  const [state, setState] = useState({ status: 'loading', error: '' })
  const [week, setWeek] = useState(emptyWeek)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getMySchedule()
      .then((rows) => {
        if (cancelled) return
        const next = emptyWeek()
        for (const r of rows) {
          next[r.dayOfWeek] = { on: true, start: String(r.startTime).slice(0, 5), end: String(r.endTime).slice(0, 5) }
        }
        setWeek(next)
        setState({ status: 'ready', error: '' })
      })
      .catch((err) => {
        if (cancelled || guard(err)) return
        setState({ status: 'error', error: err?.error ?? 'Не удалось загрузить расписание' })
      })
    return () => { cancelled = true }
  }, [guard])

  function patch(n, changes) {
    setWeek((w) => ({ ...w, [n]: { ...w[n], ...changes } }))
    setError('')
  }

  async function save() {
    const bad = DAYS.find((d) => week[d.n].on && week[d.n].end <= week[d.n].start)
    if (bad) return setError(`${bad.label}: время окончания должно быть позже начала`)

    const days = DAYS.filter((d) => week[d.n].on)
      .map((d) => ({ dayOfWeek: d.n, startTime: week[d.n].start, endTime: week[d.n].end }))

    setSaving(true)
    try {
      await saveMySchedule(days)
      show(days.length ? 'Расписание сохранено' : 'Расписание очищено: клиенты выбирают дату без времени')
    } catch (err) {
      if (!guard(err)) {
        const msg = err?.errors ? Object.values(err.errors).flat()[0] : err?.error
        setError(msg ?? 'Не удалось сохранить расписание')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="pf-panel">
      <h2>Расписание</h2>
      <p className="pf-panel-lead">
        Отметьте рабочие дни и часы. Клиент выберет свободный час (слоты по 60 минут) при заказе.
        Если расписание пустое, время при заказе не выбирается.
      </p>

      {state.status === 'loading' && <div aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton pf-sk-row" />)}</div>}
      {state.status === 'error' && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{state.error}</span></div>}

      {state.status === 'ready' && (
        <>
          <ul className="sch-list">
            {DAYS.map((d) => {
              const row = week[d.n]
              return (
                <li key={d.n} className="sch-row">
                  <label className="sch-day">
                    <input type="checkbox" checked={row.on} onChange={(e) => patch(d.n, { on: e.target.checked })} />
                    {d.label}
                  </label>
                  {row.on ? (
                    <div className="sch-times">
                      <span>с</span>
                      <Select className="sch-select" value={row.start} ariaLabel={`${d.label}: начало`}
                        onChange={(v) => patch(d.n, { start: v })}
                        options={options(START_OPTIONS, row.start).map((t) => ({ value: t, label: t }))} />
                      <span>до</span>
                      <Select className="sch-select" value={row.end} ariaLabel={`${d.label}: окончание`}
                        onChange={(v) => patch(d.n, { end: v })}
                        options={options(END_OPTIONS, row.end).map((t) => ({ value: t, label: t }))} />
                    </div>
                  ) : (
                    <span className="sch-off">Выходной</span>
                  )}
                </li>
              )
            })}
          </ul>
          {error && <div className="form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}
          <Button onClick={save} loading={saving}>Сохранить расписание</Button>
        </>
      )}
    </section>
  )
}
