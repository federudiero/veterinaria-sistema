import React, { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { AppointmentsPage } from '../appointments/AppointmentsPage.jsx'
import { WaitingQueuePage } from '../queue/WaitingQueuePage.jsx'
import { RemindersPage } from '../reminders/RemindersPage.jsx'

const AGENDA_TABS = [
  {
    id: 'turnos',
    label: 'Turnos',
    description: 'Agenda diaria, calendario, estados de atención y confirmación de turnos.',
    permission: 'agenda.read',
    Component: AppointmentsPage,
  },
  {
    id: 'cola-espera',
    label: 'Cola de espera',
    description: 'Pacientes que llegaron sin turno o están esperando atención en mostrador.',
    permission: 'agenda.read',
    Component: WaitingQueuePage,
  },
  {
    id: 'recordatorios',
    label: 'Recordatorios',
    description: 'Avisos pendientes, controles, vacunas, seguimientos y contactos programados.',
    permission: 'agenda.read',
    Component: RemindersPage,
  },
]

export function AgendaCenterPage() {
  const { hasPermission } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') || ''

  const visibleTabs = useMemo(
    () => AGENDA_TABS.filter((tab) => hasPermission(tab.permission)),
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
    <section className="ops-center-page agenda-center-page">
      <SectionHeader
        eyebrow="Operación diaria"
        title="Agenda"
        description="Centro único para turnos, cola de espera y recordatorios. La atención diaria queda ordenada en un solo lugar."
      />

      {visibleTabs.length === 0 ? (
        <div className="panel empty-state-card">
          <h2>No tenés permisos de agenda habilitados</h2>
          <p className="muted">Para usar esta sección necesitás permisos de agenda.</p>
        </div>
      ) : (
        <>
          <div className="module-tabs ops-center-tabs agenda-center-tabs" role="tablist" aria-label="Módulos de agenda">
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
