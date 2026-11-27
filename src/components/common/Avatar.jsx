import './Avatar.css'

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// фото, если оно есть, иначе инициалы
export default function Avatar({ name, url, size = 42, className = '' }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) }
  return url ? (
    <img className={`ava ${className}`} style={style} src={url} alt={name || ''} />
  ) : (
    <span className={`ava ava-text ${className}`} style={style}>{initials(name)}</span>
  )
}
