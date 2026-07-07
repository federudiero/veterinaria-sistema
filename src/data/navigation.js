export const navigation = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊', permission: null },
  { path: '/clientes', label: 'Clientes', icon: '👥', permission: 'clientes.read' },
  { path: '/pacientes', label: 'Pacientes', icon: '🐾', permission: 'pacientes.read' },
  { path: '/agenda', label: 'Agenda', icon: '📅', permission: 'agenda.read' },
  { path: '/ventas-caja', label: 'Ventas y caja', icon: '💵', permissionAny: ['ventas.read', 'caja.read'] },
  { path: '/compras', label: 'Compras y stock', icon: '🛒', permissionAny: ['compras.read', 'stock.read', 'ventas.read'] },
  { path: '/internacion', label: 'Internación', icon: '🏥', permission: 'internacion.read' },
  { path: '/mutualismo', label: 'Mutualismo', icon: '💼', permission: 'mutualismo.read' },
  { path: '/reportes', label: 'Reportes', icon: '📈', permission: 'reportes.read' },
  { path: '/sistema', label: 'Sistema', icon: '⚙️', permissionAny: ['configuracion.read', 'notificaciones.read', 'usuarios.read', 'auditoria.read', 'backup.read', 'documentos.read'] },
]
