import { ChevronLeft, ChevronRight } from 'lucide-react'

function pageList(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b)

  const result = []
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push(`gap-${p}`)
    result.push(p)
  })
  return result
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Страницы">
      <button
        type="button"
        className="page-btn"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Назад"
      >
        <ChevronLeft size={18} />
      </button>

      {pageList(page, totalPages).map((p) =>
        typeof p === 'string' ? (
          <span key={p} className="page-gap">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`page-btn${p === page ? ' active' : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className="page-btn"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Вперёд"
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  )
}