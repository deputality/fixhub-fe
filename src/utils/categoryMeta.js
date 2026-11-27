import { Camera, Car, Cpu, GraduationCap, Monitor, Scissors, SprayCan, Truck, Wrench, Zap } from 'lucide-react'
import FaucetIcon from '../components/common/FaucetIcon'
import { FALLBACK_ICON, HEX_COLOR, ICON_BY_KEY, autoColor } from './categoryIcons'

// «сантехник» должна стоять раньше «техник», иначе «Сантехника» попадёт в ремонт техники
const RULES = [
  { keys: ['сантехник'], icon: FaucetIcon, color: '#8b5cf6', image: '/categories/plumbing.jpg' },
  { keys: ['техник'], icon: Wrench, color: '#3b82f6', image: '/categories/repair.jpg' },
  { keys: ['клининг', 'уборк'], icon: SprayCan, color: '#16a34a', image: '/categories/cleaning.jpg' },
  { keys: ['репетитор'], icon: GraduationCap, color: '#f59e0b', image: '/categories/tutoring.jpg' },
  { keys: ['фото'], icon: Camera, color: '#ef4444', image: '/categories/photo.jpg' },
  { keys: ['электрик'], icon: Zap, color: '#eab308', image: null },
  { keys: ['компьютер'], icon: Monitor, color: '#0ea5e9', image: null },
  { keys: ['авто', 'машин'], icon: Car, color: '#ef4444', image: null },
  { keys: ['программ', 'разработ'], icon: Cpu, color: '#6366f1', image: null },
  { keys: ['красот', 'парикмахер', 'маникюр'], icon: Scissors, color: '#ec4899', image: null },
  { keys: ['груз', 'перевоз', 'достав'], icon: Truck, color: '#f97316', image: null },
]

const FALLBACK = { icon: FALLBACK_ICON, color: '#64748b', image: null }

function findMeta(name = '') {
  const lower = name.toLowerCase()
  return RULES.find((rule) => rule.keys.some((key) => lower.includes(key)))
}

// byId: { [id]: { id, name, parentId, icon?, color? } }
//
// Приоритет: иконка и цвет, которые админ задал самой категории; если не заданы — родителя;
// если и там пусто — подбор по названию (старые категории), иначе яркий цвет и нейтральный значок.
export function resolveCategoryMeta(categoryId, byId) {
  const chain = []
  let category = byId[categoryId]
  while (category && chain.length < 8) {
    chain.push(category)
    category = category.parentId ? byId[category.parentId] : null
  }
  if (chain.length === 0) return FALLBACK

  const icon = chain.map((c) => ICON_BY_KEY[c.icon]).find(Boolean)
  const color = chain.map((c) => c.color).find((c) => HEX_COLOR.test(c ?? ''))
  const rule = chain.map((c) => findMeta(c.name)).find(Boolean)

  return {
    icon: icon ?? rule?.icon ?? FALLBACK_ICON,
    color: color ?? rule?.color ?? autoColor(chain[chain.length - 1].id),
    // фото из подборки подходит только к категориям без собственного оформления
    image: icon || color ? null : rule?.image ?? null,
  }
}
