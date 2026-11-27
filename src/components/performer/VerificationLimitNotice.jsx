import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

// Подсказка непроверенному мастеру: что ограничено и как это снять
export default function VerificationLimitNotice({ children }) {
  return (
    <div className="vl-notice" role="note">
      <ShieldAlert size={18} />
      <span>
        {children}{' '}
        <Link to="/performer/profile">Пройти проверку</Link>
      </span>
    </div>
  )
}
