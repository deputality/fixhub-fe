import { Link } from 'react-router-dom'
import { LEGAL } from '../utils/legal'
import './LegalLayout.css'

// sections: [{ id, title, paragraphs: [string | { list: [string] }] }]
export default function LegalLayout({ title, lead, sections, other }) {
  return (
    <div className="container lg">
      <header className="lg-head">
        <h1>{title}</h1>
        <p>{lead}</p>
        <span className="lg-date">Редакция от {LEGAL.updated}</span>
      </header>

      <div className="lg-body">
        <nav className="lg-toc" aria-label="Содержание">
          {sections.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}>{i + 1}. {s.title}</a>
          ))}
        </nav>

        <div className="lg-text">
          {sections.map((s, i) => (
            <section key={s.id} id={s.id}>
              <h2>{i + 1}. {s.title}</h2>
              {s.paragraphs.map((p, j) =>
                typeof p === 'string' ? (
                  <p key={j}>{p}</p>
                ) : (
                  <ul key={j}>{p.list.map((item) => <li key={item}>{item}</li>)}</ul>
                ),
              )}
            </section>
          ))}

          <p className="lg-other">
            См. также: <Link to={other.to}>{other.label}</Link>. Вопросы по документу присылайте
            на <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
          </p>
        </div>
      </div>
    </div>
  )
}
