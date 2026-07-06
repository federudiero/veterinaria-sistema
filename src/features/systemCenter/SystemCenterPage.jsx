import React, { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { SettingsPage } from '../settings/SettingsPage.jsx'
import { UsersPage } from '../users/UsersPage.jsx'
import { TagsPage } from '../tags/TagsPage.jsx'
import { AuditPage } from '../audit/AuditPage.jsx'
import { BackupPage } from '../backup/BackupPage.jsx'
import { DocumentsPage } from '../documents/DocumentsPage.jsx'
import { NotificationsPage } from '../notifications/NotificationsPage.jsx'

const SYSTEM_TABS = [
  {
    id: 'configuracion',
    label: 'Configuración',
    description: 'Datos de la veterinaria, documentos, agenda, caja y orden del menú.',
    permission: 'configuracion.read',
    Component: SettingsPage,
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    description: 'Avisos internos, consultas del portal y emails pendientes para clientes.',
    permission: 'notificaciones.read',
    Component: NotificationsPage,
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    description: 'Equipo, roles, permisos, estado de acceso y usuarios del portal.',
    permission: 'usuarios.read',
    Component: UsersPage,
  },
  {
    id: 'etiquetas',
    label: 'Etiquetas',
    description: 'Clasificación visual para tutores, pacientes, ventas y tareas operativas.',
    permission: 'configuracion.read',
    Component: TagsPage,
  },
  {
    id: 'auditoria',
    label: 'Auditoría',
    description: 'Registro de cambios, anulaciones y acciones sensibles del sistema.',
    permission: 'auditoria.read',
    Component: AuditPage,
  },
  {
    id: 'respaldo',
    label: 'Respaldo',
    description: 'Exportación, respaldo y control de datos administrativos.',
    permission: 'backup.read',
    Component: BackupPage,
  },
  {
    id: 'documentos',
    label: 'Documentos',
    description: 'Centro general de impresión cuando el documento no sale desde su módulo.',
    permission: 'documentos.read',
    Component: DocumentsPage,
  },
]

export function SystemCenterPage() {
  const { hasPermission } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') || ''

  const visibleTabs = useMemo(
    () => SYSTEM_TABS.filter((tab) => hasPermission(tab.permission)),
    [hasPermission],
  )

  const activeTab = useMemo(() => {
    if (!visibleTabs.length) return null
    return visibleTabs.find((tab) => tab.id === requestedTab) || visibleTabs[0]
  }, [requestedTab, visibleTabs])

  useEffect(() => {
    if (!activeTab) return
    if (requestedTab === activeTab.id) return
    setSearchParams({ tab: activeTab.id }, { replace: true })
  }, [activeTab, requestedTab, setSearchParams])

  const ActiveComponent = activeTab?.Component || null

  return (
    <section className="ops-center-page system-center-page">
      <SectionHeader
        eyebrow="Administración"
        title="Sistema"
        description="Centro único para configuración, notificaciones, usuarios, etiquetas, auditoría, respaldo y documentos administrativos."
      />

      {visibleTabs.length === 0 ? (
        <div className="panel empty-state-card">
          <h2>No tenés permisos administrativos habilitados</h2>
          <p className="muted">Para usar esta sección necesitás permisos de configuración, notificaciones, usuarios, auditoría, respaldo o documentos.</p>
        </div>
      ) : (
        <>
          <div className="module-tabs ops-center-tabs system-center-tabs" role="tablist" aria-label="Módulos del sistema">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`module-tab ${activeTab?.id === tab.id ? 'active' : ''}`}
                onClick={() => setSearchParams({ tab: tab.id })}
                role="tab"
                aria-selected={activeTab?.id === tab.id}
              >
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </button>
            ))}
          </div>

          <div className="embedded-module ops-center-module" key={activeTab?.id}>
            {ActiveComponent && <ActiveComponent />}
          </div>
        </>
      )}
    </section>
  )
}
