export const navigation = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', permission: null },
  { path: '/clientes', label: 'Clientes', icon: 'clients', permission: 'clientes.read' },
  { path: '/pacientes', label: 'Pacientes', icon: 'patients', permission: 'pacientes.read' },
  { path: '/agenda', label: 'Agenda', icon: 'agenda', permission: 'agenda.read' },
  { path: '/peluqueria', label: 'Peluquería', icon: 'grooming', permission: 'agenda.read' },
  { path: '/ventas-caja', label: 'Ventas y caja', icon: 'salesCash', permissionAny: ['ventas.read', 'caja.read'] },
  { path: '/compras', label: 'Compras y stock', icon: 'purchases', permissionAny: ['compras.read', 'stock.read', 'ventas.read'] },
  { path: '/internacion', label: 'Internación', icon: 'boarding', permission: 'internacion.read' },
  { path: '/mutualismo', label: 'Mutualismo', icon: 'membership', permission: 'mutualismo.read' },
  { path: '/reportes', label: 'Reportes', icon: 'reports', permission: 'reportes.read' },
  { path: '/sistema', label: 'Sistema', icon: 'system', permissionAny: ['configuracion.read', 'notificaciones.read', 'usuarios.read', 'auditoria.read', 'backup.read', 'documentos.read'] },
]
