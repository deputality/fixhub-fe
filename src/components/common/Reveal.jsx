import { useEffect, useRef, useState } from 'react'

// Блок появляется с анимацией, когда доезжает до экрана
export default function Reveal({ as: Tag = 'div', className = '', children, ...props }) {
  const ref = useRef(null)
  // в браузере без IntersectionObserver блок сразу показан
  const [shown, setShown] = useState(() => !('IntersectionObserver' in window))

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShown(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <Tag ref={ref} className={`reveal${shown ? ' in' : ''}${className ? ` ${className}` : ''}`} {...props}>
      {children}
    </Tag>
  )
}
