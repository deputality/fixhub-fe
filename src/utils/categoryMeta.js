import { Camera, GraduationCap, Monitor, SprayCan, Wrench } from 'lucide-react'
import FaucetIcon from '../components/FaucetIcon'

// «сантехник» должна стоять раньше «техник», иначе «Сантехника» попадёт в ремонт техники
const RULES = [
  { keys: ['сантехник'], icon: FaucetIcon, color: '#8b5cf6', image: '/categories/plumbing.jpg' },
  { keys: ['техник'], icon: Wrench, color: '#3b82f6', image: '/categories/repair.jpg' },
  { keys: ['клининг', 'уборк'], icon: SprayCan, color: '#16a34a', image: '/categories/cleaning.jpg' },
  { keys: ['репетитор'], icon: GraduationCap, color: '#f59e0b', image: '/categories/tutoring.jpg' },
  { keys: ['фото'], icon: Camera, color: '#ef4444', image: '/categories/photo.jpg' },
  { keys: ['компьютер'], icon: Monitor, color: '#0ea5e9', image: null },
]

const FALLBACK = { icon: Wrench, color: '#64748b', image: null }

function findMeta(name = '') {
  const lower = name.toLowerCase()
  return RULES.find((rule) => rule.keys.some((key) => lower.includes(key)))
}

// byId: { [id]: { id, name, parentId } }
export function resolveCategoryMeta(categoryId, byId) {
  let category = byId[categoryId]
  while (category) {
    const meta = findMeta(category.name)
    if (meta) return meta
    category = category.parentId ? byId[category.parentId] : null
  }
  return FALLBACK
}