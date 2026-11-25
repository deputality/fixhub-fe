// Подписи типов документов для проверки мастера
export const DOC_KINDS = {
  Passport: 'Паспорт или удостоверение',
  Qualification: 'Диплом, сертификат',
  Other: 'Другое',
}

export const DOC_KIND_OPTIONS = Object.entries(DOC_KINDS).map(([value, label]) => ({ value, label }))

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}
