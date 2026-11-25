import { useEffect } from 'react'

// Заголовок и описание страницы для вкладки браузера и поисковиков, которые выполняют JavaScript.
// Превью ссылок в мессенджерах строятся без JavaScript, для них служит кнопка «Поделиться»
// (адреса /share/... на бэкенде).
const FIELDS = [
  ['name', 'description', 'description'],
  ['property', 'og:title', 'title'],
  ['property', 'og:description', 'description'],
  ['property', 'og:image', 'image'],
]

function setMeta(attr, key, value) {
  if (!value) return () => {}
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  const created = !el
  if (created) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  const prev = el.getAttribute('content')
  el.setAttribute('content', value)
  return () => {
    if (created) el.remove()
    else if (prev !== null) el.setAttribute('content', prev)
  }
}

export function useDocumentMeta({ title, description, image }) {
  useEffect(() => {
    if (!title) return undefined
    const prevTitle = document.title
    document.title = title

    const values = { title, description, image: image ? new URL(image, window.location.origin).href : '' }
    const restore = FIELDS.map(([attr, key, field]) => setMeta(attr, key, values[field]))

    return () => {
      document.title = prevTitle
      restore.forEach((fn) => fn())
    }
  }, [title, description, image])
}
