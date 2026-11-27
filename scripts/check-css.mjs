// Проверка CSS: `npm run lint:css`. Ловит то, из-за чего стили «не сходятся»:
//  1. один и тот же @keyframes в двух файлах;
//  2. один и тот же класс как основной селектор в нескольких файлах (глобальные файлы в ALLOW_SHARED);
//  3. числа вместо токенов: z-index, border-radius, ширина контента (>= 900px), старые токены --bg-xxxxxx.
// Исключения помечаются в LOCAL_OK ниже, с причиной.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = new URL('../src', import.meta.url).pathname
const SHARED_FILES = ['index.css', 'responsive.css', 'theme.css'] // общие файлы могут переопределять чужие классы
const LOCAL_OK = {
  'components/catalog/MapView.css': ['z-index'],       // слои внутри изолированного .map-view, нумерация Leaflet
  'components/catalog/PortfolioGallery.css': ['max-width'], // просмотр фото на весь экран, не контент страницы
}
// мелкие радиусы (скроллбар, подчёркивание) допустимы числом
const SMALL_RADIUS = /^(0|50%|inherit|[1-4]px)$/

const files = []
;(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) walk(p)
    else if (n.endsWith('.css')) files.push(p)
  }
})(SRC)

const errors = []
const err = (f, msg) => errors.push(`${relative(SRC, f)}: ${msg}`)
const keyframes = new Map()
const subjects = new Map() // класс -> Set файлов

for (const f of files) {
  const rel = relative(SRC, f)
  if (rel === 'tokens.css') continue
  const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const ok = LOCAL_OK[rel] ?? []

  for (const m of css.matchAll(/@keyframes\s+([\w-]+)/g)) {
    if (!keyframes.has(m[1])) keyframes.set(m[1], new Set())
    keyframes.get(m[1]).add(rel)
  }
  if (!SHARED_FILES.includes(rel)) {
    for (const m of css.matchAll(/([^{}]+)\{/g)) {
      const head = m[1].trim()
      if (head.startsWith('@')) continue
      for (const sel of head.split(',')) {
        const one = sel.trim()
        if (/[\s>+~]|:has\(/.test(one)) continue // с родителем — это контекстное переопределение, а не новое определение
        const compound = one.match(/^\.[\w-]+/)
        if (!compound) continue
        const c = compound[0].slice(1)
        if (one === '.' + c || one.startsWith('.' + c + ':')) {
          if (!subjects.has(c)) subjects.set(c, new Set())
          subjects.get(c).add(rel)
        }
      }
    }
  }
  if (!ok.includes('z-index'))
    for (const m of css.matchAll(/z-index:\s*([^;}]+)/g)) {
      const v = m[1].trim()
      if (!/^var\(--z-|^calc\(var\(--z-|^0$/.test(v)) err(f, `z-index: ${v} — используйте токен --z-*`)
    }
  for (const m of css.matchAll(/border(?:-[a-z]+)*-radius:\s*([^;}]+)/g))
    for (const v of m[1].trim().split(/\s+/))
      if (!v.startsWith('var(') && !SMALL_RADIUS.test(v)) err(f, `border-radius: ${v} — используйте --r-sm / --r-md / --r-lg / --r-pill`)
  if (!ok.includes('max-width'))
    for (const m of css.matchAll(/(?<![-\w(])max-width:\s*(\d+)px/g))
      if (+m[1] >= 900)
        err(f, `max-width: ${m[1]}px — ширина контента берётся из --w-wide / --w-narrow`)
  for (const m of css.matchAll(/var\(--(?:bg|bd|tx)-[0-9a-f]{6}\)/g)) err(f, `${m[0]} — старый токен, см. tokens.css`)
}

for (const [k, v] of keyframes) if (v.size > 1) errors.push(`@keyframes ${k} объявлен в нескольких файлах: ${[...v].join(', ')}`)
for (const [c, v] of subjects) if (v.size > 1) errors.push(`.${c} объявлен в нескольких файлах: ${[...v].join(', ')} — добавьте префикс страницы`)

if (errors.length) {
  console.error(errors.join('\n') + `\n\n${errors.length} замечаний`)
  process.exit(1)
}
console.log(`CSS в порядке (${files.length} файлов)`)
