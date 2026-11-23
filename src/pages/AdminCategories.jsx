import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, CircleAlert, Eye, EyeOff, Info, LayoutGrid, Plus, RotateCcw, Search } from 'lucide-react'
import {
  createCategory, deleteCategory, getAdminCategories, hideCategory, showCategory, updateCategory,
} from '../api/admin'
import { useToast } from '../context/ToastContext'
import { CATEGORY_ICONS, COLOR_PRESETS, HEX_COLOR } from '../utils/categoryIcons'
import { resolveCategoryMeta } from '../utils/categoryMeta'
import { useAuthGuard } from '../utils/useAuthGuard'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Select from '../components/Select'
import './AdminPage.css'
import './AdminSections.css'

const TABS = [
  { value: 'all', label: 'Все' },
  { value: 'visible', label: 'В каталоге' },
  { value: 'hidden', label: 'Скрытые' },
]

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

// подпись под названием: «Ремонт техники» -> remont-tehniki
function slugify(name) {
  return [...name.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function plural(n, [one, few, many]) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few
  return many
}

const num = (n) => n.toLocaleString('ru-RU')

// плоский список -> дерево, выведенное по порядку с отступом (depth)
function buildRows(list) {
  const byParent = new Map()
  list.forEach((c) => {
    const key = c.parentId ?? 0
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key).push(c)
  })
  const rows = []
  const walk = (parentId, depth) => {
    (byParent.get(parentId) ?? []).forEach((c) => {
      rows.push({ ...c, depth })
      walk(c.id, depth + 1)
    })
  }
  walk(0, 0)
  return rows
}

// id категории и всех её потомков: их нельзя выбрать родителем
function descendantIds(list, id) {
  const ids = new Set([id])
  let added = true
  while (added) {
    added = false
    list.forEach((c) => {
      if (c.parentId != null && ids.has(c.parentId) && !ids.has(c.id)) {
        ids.add(c.id)
        added = true
      }
    })
  }
  return ids
}

function StatCard({ icon, tone, label, value, note, loading }) {
  return (
    <div className="stat">
      <span className={`stat-icon ${tone}`}>{icon}</span>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        {loading ? (
          <>
            <i className="skel" style={{ width: 50, height: 28, margin: '8px 0 10px' }} />
            <i className="skel" style={{ width: 140, height: 12 }} />
          </>
        ) : (
          <>
            <div className="stat-value">{value}</div>
            <div className="stat-note">{note}</div>
          </>
        )}
      </div>
    </div>
  )
}

// Выбор значка и цвета категории с живым предпросмотром (так её увидят клиенты в каталоге).
// Пустые значения = «автоматически»: стиль берётся от родителя или подбирается по названию.
function StylePicker({ draft, all, icon, color, onIcon, onColor }) {
  const meta = useMemo(() => {
    const byId = Object.fromEntries(all.map((c) => [c.id, c]))
    byId[draft.id] = { ...draft, icon, color }
    return resolveCategoryMeta(draft.id, byId)
  }, [all, draft, icon, color])

  const Icon = meta.icon
  const custom = HEX_COLOR.test(color) && !COLOR_PRESETS.includes(color.toLowerCase())

  return (
    <div className="as-style">
      <div className="as-style-head">
        <span className="field-label">Оформление</span>
        {(icon || color) && (
          <button type="button" className="as-style-reset" onClick={() => { onIcon(''); onColor('') }}>
            <RotateCcw size={13} /> Подобрать автоматически
          </button>
        )}
      </div>

      <div className="as-preview" aria-label="Предпросмотр">
        <span className="chip-icon" style={{ '--c': meta.color }}><Icon size={22} /></span>
        <span className="as-preview-name">{draft.name.trim() || 'Название категории'}</span>
        <span className="as-preview-tile" style={{ '--cat': meta.color }} aria-hidden="true"><Icon size={20} /></span>
      </div>

      <div className="as-style-block">
        <span className="as-style-label">Иконка{!icon && <em>сейчас подобрана автоматически</em>}</span>
        <div className="as-icons" role="group" aria-label="Иконка категории">
          {CATEGORY_ICONS.map(({ key, label, icon: I }) => (
            <button
              key={key}
              type="button"
              className={`as-icon-btn${icon === key ? ' active' : ''}`}
              aria-pressed={icon === key}
              aria-label={label}
              title={label}
              onClick={() => onIcon(icon === key ? '' : key)}
            >
              <I size={20} />
            </button>
          ))}
        </div>
      </div>

      <div className="as-style-block">
        <span className="as-style-label">Цвет{!color && <em>сейчас подобран автоматически</em>}</span>
        <div className="as-colors" role="group" aria-label="Цвет категории">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              className={`as-color-btn${color.toLowerCase() === c ? ' active' : ''}`}
              style={{ '--c': c }}
              aria-pressed={color.toLowerCase() === c}
              aria-label={`Цвет ${c}`}
              onClick={() => onColor(color.toLowerCase() === c ? '' : c)}
            >
              <Check size={15} strokeWidth={3} />
            </button>
          ))}
          <label className={`as-color-own${custom ? ' active' : ''}`} style={custom ? { '--c': color } : undefined} title="Свой цвет">
            <input
              type="color"
              value={HEX_COLOR.test(color) ? color : meta.color}
              onChange={(e) => onColor(e.target.value)}
              aria-label="Свой цвет"
            />
            {custom && <Check size={15} strokeWidth={3} />}
          </label>
        </div>
      </div>
    </div>
  )
}

function CategoryForm({ category, all, onClose, onSaved, onDelete, onAuthError }) {
  const { show } = useToast()
  const isEdit = Boolean(category?.id)
  const [name, setName] = useState(category?.name ?? '')
  const [parentId, setParentId] = useState(category?.parentId ?? '')
  const [icon, setIcon] = useState(category?.icon ?? '')
  const [color, setColor] = useState(category?.color ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const options = useMemo(() => {
    const banned = isEdit ? descendantIds(all, category.id) : new Set()
    const rows = buildRows(all.filter((c) => !banned.has(c.id)))
    return [
      { value: '', label: 'Без родителя (основная категория)' },
      ...rows.map((c) => ({ value: c.id, label: c.name, depth: c.depth })),
    ]
  }, [all, category, isEdit])

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Введите название категории')

    setSaving(true)
    setError('')
    const body = {
      name: name.trim(),
      parentId: parentId === '' ? null : Number(parentId),
      icon: icon || null,
      color: color || null,
    }
    try {
      if (isEdit) await updateCategory(category.id, body)
      else await createCategory(body)
      show(isEdit ? 'Категория обновлена' : 'Категория добавлена')
      onSaved()
    } catch (err) {
      if (!onAuthError(err)) setError(err?.error ?? 'Не удалось сохранить категорию')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal size="lg" title={isEdit ? 'Редактировать категорию' : 'Новая категория'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {error && <div className="form-alert as-form-alert" role="alert"><CircleAlert size={18} /><span>{error}</span></div>}

        <div className="as-form">
          <Input
            id="cat-name" label="Название" maxLength={100} autoFocus
            value={name} onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="Например, Сантехника"
          />
          <div className="field">
            <label className="field-label" htmlFor="cat-parent">Родительская категория</label>
            <Select id="cat-parent" value={parentId} onChange={setParentId} options={options} />
          </div>

          <StylePicker
            draft={{ id: category?.id ?? -1, name, parentId: parentId === '' ? null : Number(parentId) }}
            all={all}
            icon={icon}
            color={color}
            onIcon={setIcon}
            onColor={setColor}
          />
        </div>

        <div className="modal-actions as-modal-actions">
          {isEdit && (
            <button type="button" className="as-delete" onClick={() => onDelete(category)}>Удалить категорию</button>
          )}
          <Button type="button" variant="outline" className="btn-sm" onClick={onClose}>Отмена</Button>
          <Button type="submit" className="btn-sm" loading={saving}>Сохранить</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminCategories() {
  const onAuthError = useAuthGuard()
  const { show } = useToast()
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const [reload, setReload] = useState(0)
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [form, setForm] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getAdminCategories()
      .then((items) => { if (!cancelled) setState({ status: 'ready', items, error: '' }) })
      .catch((err) => {
        if (cancelled || onAuthError(err)) return
        setState({ status: 'error', items: [], error: err?.error ?? 'Не удалось загрузить категории' })
      })
    return () => { cancelled = true }
  }, [reload, onAuthError])

  const refresh = useCallback(() => setReload((r) => r + 1), [])
  const loading = state.status === 'loading'
  const { items } = state

  const byId = useMemo(() => Object.fromEntries(items.map((c) => [c.id, c])), [items])

  // подкатегория скрытой категории тоже пропадает из каталога
  const parentHidden = useCallback((c) => Boolean(c.parentId && byId[c.parentId]?.isHidden), [byId])
  const isOut = useCallback((c) => c.isHidden || parentHidden(c), [parentHidden])

  const hiddenCount = items.filter(isOut).length
  const visibleCount = items.length - hiddenCount
  // у корневых категорий услуги уже посчитаны вместе с подкатегориями
  const totalServices = items.filter((c) => !c.parentId).reduce((sum, c) => sum + c.servicesCount, 0)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return buildRows(items).filter((c) => {
      if (tab === 'visible' && isOut(c)) return false
      if (tab === 'hidden' && !isOut(c)) return false
      return !q || c.name.toLowerCase().includes(q)
    })
  }, [items, tab, search, isOut])

  async function toggleHidden(category) {
    setBusyId(category.id)
    try {
      const updated = category.isHidden ? await showCategory(category.id) : await hideCategory(category.id)
      setState((s) => ({ ...s, items: s.items.map((c) => (c.id === updated.id ? updated : c)) }))
      show(updated.isHidden ? 'Категория скрыта из каталога' : 'Категория снова в каталоге')
    } catch (err) {
      if (!onAuthError(err)) show(err?.error ?? 'Не удалось выполнить действие', 'error')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    try {
      await deleteCategory(toDelete.id)
      show('Категория удалена')
      setToDelete(null)
      refresh()
    } catch (err) {
      if (!onAuthError(err)) show(err?.error ?? 'Не удалось удалить категорию', 'error')
      setToDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  const counts = { all: items.length, visible: visibleCount, hidden: hiddenCount }

  return (
    <div className="admin-page">
      <div className="as-top">
        <header className="admin-head">
          <h1>Категории услуг</h1>
          <p>Управляйте категориями и их видимостью в каталоге FixHub.</p>
        </header>
        <button type="button" className="as-add-btn" onClick={() => setForm({})}>
          <Plus size={16} strokeWidth={2.4} /> Добавить категорию
        </button>
      </div>

      <div className="stats as-stats3">
        <StatCard
          tone="tone-blue" icon={<LayoutGrid size={26} />} label="Всего категорий" loading={loading}
          value={items.length} note="Включая скрытые категории"
        />
        <StatCard
          tone="tone-green" icon={<Eye size={26} />} label="В каталоге" loading={loading}
          value={visibleCount} note="Доступны клиентам для поиска"
        />
        <StatCard
          tone="tone-gray" icon={<EyeOff size={26} />} label="Скрытые" loading={loading}
          value={hiddenCount} note="Не отображаются в каталоге"
        />
      </div>

      <section className="adm-panel">
        <div className="panel-head">
          <h2>Список категорий</h2>
          <span className="as-count">{items.length} {plural(items.length, ['категория', 'категории', 'категорий'])}</span>
        </div>

        <div className="as-toolbar">
          <div className="as-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.value} type="button" role="tab" aria-selected={tab === t.value}
                className={`as-tab${tab === t.value ? ' active' : ''}`}
                onClick={() => setTab(t.value)}
              >
                {t.label} · {counts[t.value]}
              </button>
            ))}
          </div>

          <label className="adm-search as-search">
            <Search size={16} />
            <input
              type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию категории…" aria-label="Поиск категорий" maxLength={100}
            />
          </label>
        </div>

        {state.status === 'error' ? (
          <div className="form-alert adm-alert" role="alert">
            <CircleAlert size={18} />
            <span>
              {state.error}{' '}
              <button type="button" className="link-btn" onClick={() => { setState({ status: 'loading', items: [], error: '' }); refresh() }}>
                Повторить
              </button>
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="adm-table as-table-cats">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Категория</th>
                  <th>Услуги</th>
                  <th>Исполнители</th>
                  <th>Видимость</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {loading && Array.from({ length: 5 }, (_, i) => (
                  <tr key={`sk-${i}`} className="row-skel"><td colSpan={6}><i className="skel" style={{ height: 44 }} /></td></tr>
                ))}

                {!loading && rows.map((c) => {
                  const out = isOut(c)
                  const meta = resolveCategoryMeta(c.id, byId)
                  const Icon = meta.icon
                  return (
                    <tr key={c.id}>
                      <td className="cell-id as-id">{String(c.id).padStart(2, '0')}</td>
                      <td>
                        <div className="as-cat" style={{ paddingLeft: c.depth * 28 }}>
                          <span className="as-cat-icon" style={{ background: out ? '#64748b' : meta.color }}>
                            <Icon size={19} strokeWidth={1.9} />
                          </span>
                          <span>
                            <span className="as-cat-name">{c.name}</span>
                            <span className="as-cat-slug">{slugify(c.name)}</span>
                          </span>
                        </div>
                      </td>
                      <td className="as-num">{num(c.servicesCount)}</td>
                      <td className="as-num">{num(c.performersCount)}</td>
                      <td>
                        {!out && <span className="pill st-active">В каталоге</span>}
                        {c.isHidden && <span className="pill st-hidden">Скрыта</span>}
                        {!c.isHidden && out && <span className="pill st-hidden">Скрыта родителем</span>}
                      </td>
                      <td>
                        <div className="as-actions">
                          <button type="button" className="as-btn" onClick={() => setForm(c)}>Изменить</button>
                          <button type="button" className="as-btn" disabled={busyId === c.id} onClick={() => toggleHidden(c)}>
                            {c.isHidden ? 'Показать' : 'Скрыть'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {!loading && rows.length === 0 && (
                  <tr className="row-empty">
                    <td colSpan={6}>{items.length === 0 ? 'Категорий пока нет. Добавьте первую.' : 'Ничего не найдено.'}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="panel-foot">
          <span>Показано {rows.length} из {items.length} {plural(items.length, ['категории', 'категорий', 'категорий'])}</span>
          <span>Всего услуг: <b>{num(totalServices)}</b></span>
        </div>
      </section>

      <p className="as-note"><Info size={15} /> Скрытая категория не видна клиентам. Услуги и текущие заказы сохраняются.</p>

      {form && (
        <CategoryForm
          category={form}
          all={items}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); refresh() }}
          onDelete={(c) => { setForm(null); setToDelete(c) }}
          onAuthError={onAuthError}
        />
      )}

      {toDelete && (
        <Modal title="Удалить категорию?" onClose={() => setToDelete(null)}>
          <p className="modal-text">
            Категория «{toDelete.name}» будет удалена. Если в ней есть услуги или подкатегории, сервер не даст её удалить.
            Чтобы просто убрать её из каталога, используйте кнопку «Скрыть».
          </p>
          <div className="modal-actions">
            <Button variant="outline" className="btn-sm" onClick={() => setToDelete(null)}>Отмена</Button>
            <Button variant="danger" className="btn-sm" loading={deleting} onClick={confirmDelete}>Удалить</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
