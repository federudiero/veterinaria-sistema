export function money(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function dateLabel(value) {
  if (!value) return '-'
  if (typeof value?.toDate === 'function') {
    const date = value.toDate()
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: date.getHours() || date.getMinutes() ? 'short' : undefined }).format(date)
  }
  if (value instanceof Date) {
    return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short' }).format(value)
  }
  const text = String(value)
  const [year, month, day] = text.slice(0, 10).split('-')
  if (!year || !month || !day || year.length !== 4) return text
  return `${day}/${month}/${year}`
}

export function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function textIncludes(value, query) {
  return String(value || '').toLowerCase().includes(String(query || '').toLowerCase())
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0)
}
