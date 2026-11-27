import { useSyncExternalStore } from 'react'
import { LOGO_SRC } from './brand'

// Выбор темы хранится в localStorage ('light' или 'dark'). По умолчанию светлая.
// Сам цвет задаёт атрибут data-theme на <html>: его стили лежат в theme.css.
// Чтобы при загрузке не мигала светлая тема, тот же атрибут ставит маленький скрипт в index.html.
const KEY = 'theme'
const EVENT = 'fixhub:theme'

function saved() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function getTheme() {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function apply(theme) {
  document.documentElement.dataset.theme = theme
  // цвет строки браузера на телефоне
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0f19' : '#2563eb')
  window.dispatchEvent(new Event(EVENT))
}

export function initTheme() {
  apply(saved())
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // без localStorage тема просто не запомнится
  }
  apply(theme)
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark')
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  return () => window.removeEventListener(EVENT, callback)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => 'light')
}

// на тёмном фоне нужен логотип со светлой надписью
export function useLogoSrc() {
  return useTheme() === 'dark' ? '/logo-admin.svg' : LOGO_SRC
}
