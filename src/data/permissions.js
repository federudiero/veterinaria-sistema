export const PERMISSION_GROUPS = [
  {
    title: 'Clientes y pacientes',
    items: [
      ['clientes.read', 'Ver clientes'],
      ['clientes.write', 'Crear/editar clientes'],
      ['pacientes.read', 'Ver pacientes'],
      ['pacientes.write', 'Crear/editar pacientes'],
    ],
  },
  {
    title: 'Clínica',
    items: [
      ['clinica.read', 'Ver historia clínica, vacunas y recetas'],
      ['clinica.write', 'Crear/editar historia clínica, vacunas y recetas'],
      ['internacion.read', 'Ver internación'],
      ['internacion.write', 'Crear/editar internación'],
    ],
  },
  {
    title: 'Agenda',
    items: [
      ['agenda.read', 'Ver agenda, cola y recordatorios'],
      ['agenda.write', 'Crear/editar agenda, cola y recordatorios'],
    ],
  },
  {
    title: 'Comercial',
    items: [
      ['ventas.read', 'Ver ventas'],
      ['ventas.write', 'Crear/cobrar/anular ventas'],
      ['caja.read', 'Ver caja y cuentas corrientes'],
      ['caja.write', 'Crear movimientos de caja'],
      ['caja.close', 'Crear/cerrar turnos y cerrar caja'],
      ['stock.read', 'Ver productos y stock'],
      ['stock.write', 'Crear/editar productos y stock'],
      ['compras.read', 'Ver proveedores y compras'],
      ['compras.write', 'Crear/editar proveedores y compras'],
      ['mutualismo.read', 'Ver mutualismo'],
      ['mutualismo.write', 'Crear/editar mutualismo'],
    ],
  },
  {
    title: 'Sistema',
    items: [
      ['reportes.read', 'Ver reportes'],
      ['documentos.read', 'Generar documentos profesionales'],
      ['backup.read', 'Ver respaldo'],
      ['backup.write', 'Generar backup JSON'],
      ['usuarios.read', 'Ver usuarios y permisos'],
      ['usuarios.write', 'Crear/editar usuarios y permisos'],
      ['auditoria.read', 'Ver auditoría'],
      ['configuracion.read', 'Ver configuración'],
      ['configuracion.write', 'Editar configuración'],
    ],
  },
]

export const PERMISSIONS = PERMISSION_GROUPS.flatMap((group) => group.items.map(([value]) => value))

export const PERMISSION_LABELS = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((group) => group.items.map(([value, label]) => [value, label])),
)

export const PERMISSION_OPTIONS = PERMISSION_GROUPS.flatMap((group) =>
  group.items.map(([value, label]) => ({ value, label, group: group.title })),
)

export const ROLE_LABELS = {
  admin: 'Administrador',
  veterinario: 'Veterinario/a',
  recepcion: 'Recepción',
  caja: 'Caja',
  stock: 'Stock / Depósito',
  lectura: 'Solo lectura',
  pendiente: 'Pendiente de aprobación',
}

export const DEFAULT_ROLE_PERMISSIONS = {
  admin: PERMISSIONS,
  veterinario: [
    'clientes.read',
    'pacientes.read',
    'pacientes.write',
    'clinica.read',
    'clinica.write',
    'agenda.read',
    'agenda.write',
    'internacion.read',
    'internacion.write',
    'reportes.read',
    'documentos.read',
  ],
  recepcion: [
    'clientes.read',
    'clientes.write',
    'pacientes.read',
    'pacientes.write',
    'agenda.read',
    'agenda.write',
    'ventas.read',
    'ventas.write',
    'caja.read',
    'documentos.read',
  ],
  caja: [
    'clientes.read',
    'pacientes.read',
    'ventas.read',
    'ventas.write',
    'caja.read',
    'caja.write',
    'caja.close',
    'reportes.read',
    'documentos.read',
  ],
  stock: [
    'stock.read',
    'stock.write',
    'compras.read',
    'compras.write',
    'reportes.read',
  ],
  lectura: [
    'clientes.read',
    'pacientes.read',
    'clinica.read',
    'agenda.read',
    'ventas.read',
    'caja.read',
    'stock.read',
    'compras.read',
    'internacion.read',
    'mutualismo.read',
    'reportes.read',
    'configuracion.read',
    'documentos.read',
    'backup.read',
  ],
  pendiente: [],
}

export function getRolePermissions(role) {
  return DEFAULT_ROLE_PERMISSIONS[role] || []
}

export function normalizePermissions(value) {
  if (Array.isArray(value)) return value.filter((permission) => PERMISSIONS.includes(permission))
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((permission) => PERMISSIONS.includes(permission))
}
