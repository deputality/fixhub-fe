import {
  Baby, Bath, Bike, BookOpen, Briefcase, Camera, Car, Cpu, Dog, Dumbbell, Flame, Gift, GraduationCap,
  Hammer, Heart, Key, Laptop, Leaf, Lightbulb, Monitor, Music, Package, Paintbrush, Palette, Plane,
  Scissors, Shield, Shirt, Smartphone, Snowflake, Sofa, Sparkles, SprayCan, Tag, Truck, Tv, Utensils,
  Wifi, Wrench, Zap,
} from 'lucide-react'
import FaucetIcon from '../components/common/FaucetIcon'

// Набор иконок, из которых админ выбирает значок категории.
// key сохраняется в базе, поэтому уже выданные ключи переименовывать нельзя.
export const CATEGORY_ICONS = [
  { key: 'wrench', label: 'Ремонт', icon: Wrench },
  { key: 'hammer', label: 'Строительство', icon: Hammer },
  { key: 'faucet', label: 'Сантехника', icon: FaucetIcon },
  { key: 'zap', label: 'Электрика', icon: Zap },
  { key: 'lightbulb', label: 'Освещение', icon: Lightbulb },
  { key: 'spray-can', label: 'Клининг', icon: SprayCan },
  { key: 'sparkles', label: 'Чистота', icon: Sparkles },
  { key: 'bath', label: 'Ванная', icon: Bath },
  { key: 'sofa', label: 'Мебель', icon: Sofa },
  { key: 'paintbrush', label: 'Покраска', icon: Paintbrush },
  { key: 'palette', label: 'Дизайн', icon: Palette },
  { key: 'key', label: 'Замки и ключи', icon: Key },
  { key: 'car', label: 'Автомобили', icon: Car },
  { key: 'truck', label: 'Грузоперевозки', icon: Truck },
  { key: 'bike', label: 'Велосипеды', icon: Bike },
  { key: 'plane', label: 'Путешествия', icon: Plane },
  { key: 'monitor', label: 'Компьютеры', icon: Monitor },
  { key: 'laptop', label: 'Ноутбуки', icon: Laptop },
  { key: 'smartphone', label: 'Телефоны', icon: Smartphone },
  { key: 'tv', label: 'Телевизоры', icon: Tv },
  { key: 'cpu', label: 'Программирование', icon: Cpu },
  { key: 'wifi', label: 'Интернет', icon: Wifi },
  { key: 'snowflake', label: 'Кондиционеры', icon: Snowflake },
  { key: 'flame', label: 'Отопление', icon: Flame },
  { key: 'camera', label: 'Фото и видео', icon: Camera },
  { key: 'music', label: 'Музыка', icon: Music },
  { key: 'graduation-cap', label: 'Репетиторы', icon: GraduationCap },
  { key: 'book-open', label: 'Обучение', icon: BookOpen },
  { key: 'briefcase', label: 'Бизнес', icon: Briefcase },
  { key: 'scissors', label: 'Красота', icon: Scissors },
  { key: 'shirt', label: 'Одежда', icon: Shirt },
  { key: 'heart', label: 'Здоровье', icon: Heart },
  { key: 'dumbbell', label: 'Спорт', icon: Dumbbell },
  { key: 'baby', label: 'Дети', icon: Baby },
  { key: 'dog', label: 'Животные', icon: Dog },
  { key: 'leaf', label: 'Сад и огород', icon: Leaf },
  { key: 'utensils', label: 'Еда', icon: Utensils },
  { key: 'gift', label: 'Праздники', icon: Gift },
  { key: 'package', label: 'Доставка', icon: Package },
  { key: 'shield', label: 'Безопасность', icon: Shield },
]

export const ICON_BY_KEY = Object.fromEntries(CATEGORY_ICONS.map((i) => [i.key, i.icon]))

// значок, когда ничего не задано и по названию ничего не подошло
export const FALLBACK_ICON = Tag

// готовые цвета для выбора
export const COLOR_PRESETS = [
  '#3b82f6', '#2563eb', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#16a34a',
  '#14b8a6', '#0ea5e9', '#64748b', '#334155',
]

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

// Новая категория без цвета получает один из ярких цветов (одинаковый при каждой загрузке),
// а не серый, как раньше.
const AUTO_COLORS = ['#3b82f6', '#8b5cf6', '#16a34a', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899', '#14b8a6']

export function autoColor(id) {
  const n = Number(id)
  return AUTO_COLORS[(Number.isFinite(n) ? Math.abs(n) : 0) % AUTO_COLORS.length]
}
