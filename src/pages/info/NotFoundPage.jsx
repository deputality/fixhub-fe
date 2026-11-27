import { Link, useNavigate } from 'react-router-dom'
import './StaticPages.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="container nf">
      <div className="nf-code">404</div>
      <h1>Такой страницы нет</h1>
      <p>Возможно, ссылка устарела или в адресе опечатка. Вернитесь на главную и найдите нужную услугу в каталоге.</p>
      <div className="nf-actions">
        <Link to="/" className="btn btn-primary">На главную</Link>
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Назад</button>
      </div>
    </div>
  )
}
