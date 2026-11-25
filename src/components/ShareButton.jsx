import { Share2 } from 'lucide-react'
import { useToast } from '../context/ToastContext'

// path: адрес страницы для превью на бэкенде, например /share/services/5.
// Он отдаёт мессенджерам заголовок и картинку и сразу ведёт человека на сайт.
export default function ShareButton({ path, title, className = '' }) {
  const { show } = useToast()

  async function handleShare() {
    const url = `${window.location.origin}${path}`

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }

    try {
      await navigator.clipboard.writeText(url)
      show('Ссылка скопирована')
    } catch {
      show('Не удалось скопировать ссылку', 'error')
    }
  }

  return (
    <button type="button" className={`share-btn ${className}`} onClick={handleShare}>
      <Share2 size={16} /> Поделиться
    </button>
  )
}
