import { Moon, Sun } from 'lucide-react'
import { toggleTheme, useTheme } from '../utils/theme'

// Кнопка «светлая / тёмная тема». Стили (.theme-toggle) лежат в theme.css
export default function ThemeToggle() {
  const dark = useTheme() === 'dark'
  const label = dark ? 'Включить светлую тему' : 'Включить тёмную тему'

  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label={label} title={label}>
      {dark ? <Sun size={24} strokeWidth={1.8} /> : <Moon size={24} strokeWidth={1.8} />}
    </button>
  )
}
