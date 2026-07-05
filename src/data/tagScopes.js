export const TAG_SCOPE_OPTIONS = [
  { value: 'clients', label: 'Clientes', group: 'Maestros' },
  { value: 'patients', label: 'Pacientes', group: 'Clínica' },
  { value: 'clinicalRecords', label: 'Historia clínica', group: 'Clínica' },
  { value: 'vaccines', label: 'Vacunas', group: 'Clínica' },
  { value: 'prescriptions', label: 'Recetas', group: 'Clínica' },
  { value: 'appointments', label: 'Agenda', group: 'Recepción' },
  { value: 'reminders', label: 'Recordatorios', group: 'Recepción' },
  { value: 'waitingQueue', label: 'Cola de espera', group: 'Recepción' },
  { value: 'sales', label: 'Ventas', group: 'Comercial' },
  { value: 'currentAccounts', label: 'Cuentas corrientes', group: 'Comercial' },
  { value: 'shifts', label: 'Cajas del día', group: 'Caja' },
  { value: 'cashMovements', label: 'Movimientos de caja', group: 'Caja' },
  { value: 'products', label: 'Productos y stock', group: 'Inventario' },
  { value: 'suppliers', label: 'Proveedores', group: 'Compras' },
  { value: 'purchases', label: 'Compras', group: 'Compras' },
  { value: 'futurePurchases', label: 'Compras futuras', group: 'Compras' },
  { value: 'boarding', label: 'Internación', group: 'Servicios' },
  { value: 'memberships', label: 'Mutualismo', group: 'Servicios' },
  { value: 'documents', label: 'Documentos', group: 'Administración' },
]

export const TAG_SCOPE_LABELS = Object.fromEntries(TAG_SCOPE_OPTIONS.map((item) => [item.value, item.label]))

export const TAG_COLOR_OPTIONS = [
  { value: 'teal', label: 'Verde agua' },
  { value: 'blue', label: 'Celeste' },
  { value: 'violet', label: 'Violeta' },
  { value: 'amber', label: 'Ámbar' },
  { value: 'rose', label: 'Rosa' },
  { value: 'slate', label: 'Gris suave' },
  { value: 'green', label: 'Verde' },
]

export function normalizeTagIds(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function tagAppliesToScope(tag, scope) {
  if (!tag || tag.active === false) return false
  const scopes = normalizeTagIds(tag.scopes)
  return scopes.includes(scope) || scopes.includes('*')
}

export function tagsForScope(tags = [], scope = '') {
  return tags
    .filter((tag) => tagAppliesToScope(tag, scope))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))
}

export function tagOptionsForScope(tags = [], scope = '') {
  return tagsForScope(tags, scope).map((tag) => ({
    value: tag.id,
    label: tag.name,
    color: tag.color || 'teal',
  }))
}

export function tagNamesFromIds(tagIds = [], tags = []) {
  const ids = normalizeTagIds(tagIds)
  const map = Object.fromEntries(tags.map((tag) => [tag.id, tag.name]))
  return ids.map((id) => map[id]).filter(Boolean)
}
