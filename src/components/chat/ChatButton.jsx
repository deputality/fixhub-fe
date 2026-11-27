import { MessageCircle } from 'lucide-react'
import './OrderChat.css'

// Кнопка «Чат» с красным значком непрочитанных сообщений
export default function ChatButton({ count = 0, onClick, label = 'Чат' }) {
  return (
    <button type="button" className="chat-btn" onClick={onClick}>
      <MessageCircle size={16} /> {label}
      {count > 0 && <span key={count} className="chat-badge">{count > 9 ? '9+' : count}</span>}
    </button>
  )
}
