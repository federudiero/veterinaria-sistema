import React, { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { dateLabel } from '../../utils/formatters.js'

function normalizeClientIds(user) {
  const ids = []
  if (user?.clientId) ids.push(user.clientId)
  if (Array.isArray(user?.clientIds)) ids.push(...user.clientIds)
  return [...new Set(ids.map((item) => String(item || '').trim()).filter(Boolean))]
}

function clientWhere(clientIds) {
  if (!clientIds.length) return [{ field: 'clientId', op: '==', value: '__sin_cliente_vinculado__' }]
  if (clientIds.length === 1) return [{ field: 'clientId', op: '==', value: clientIds[0] }]
  return [{ field: 'clientId', op: 'in', value: clientIds.slice(0, 10) }]
}

function byDateDesc(a, b) {
  return String(b.date || b.nextDueDate || '').localeCompare(String(a.date || a.nextDueDate || ''))
}

function groupByPatient(rows) {
  return rows.reduce((acc, row) => {
    const key = row.patientId || 'sin-paciente'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})
}

function EmptyPortalState({ title, description }) {
  return (
    <div className="portal-empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}

function TimelineItem({ title, date, meta, children }) {
  return (
    <article className="portal-timeline-item">
      <div>
        <strong>{title}</strong>
        <span>{dateLabel(date) || 'Sin fecha'}</span>
      </div>
      {meta && <em>{meta}</em>}
      {children && <p>{children}</p>}
    </article>
  )
}

export function PatientPortalPage() {
  const { user, logout } = useAuth()
  const clientIds = useMemo(() => normalizeClientIds(user), [user])
  const where = useMemo(() => clientWhere(clientIds), [clientIds])
  const patients = useCollection('patients', { where, limitCount: 100, orderByField: 'name', orderDirection: 'asc' })
  const clinicalRecords = useCollection('clinicalRecords', { where, limitCount: 200, orderByField: 'date', orderDirection: 'desc' })
  const vaccines = useCollection('vaccines', { where, limitCount: 200, orderByField: 'date', orderDirection: 'desc' })
  const prescriptions = useCollection('prescriptions', { where, limitCount: 200, orderByField: 'date', orderDirection: 'desc' })
  const appointments = useCollection('appointments', { where, limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const [selectedPatientId, setSelectedPatientId] = useState('')

  const loading = patients.loading || clinicalRecords.loading || vaccines.loading || prescriptions.loading || appointments.loading
  const error = patients.error || clinicalRecords.error || vaccines.error || prescriptions.error || appointments.error
  const patientRows = patients.items || []
  const selectedPatient = patientRows.find((item) => item.id === selectedPatientId) || patientRows[0] || null
  const effectivePatientId = selectedPatient?.id || ''

  const clinicalByPatient = useMemo(() => groupByPatient(clinicalRecords.items || []), [clinicalRecords.items])
  const vaccinesByPatient = useMemo(() => groupByPatient(vaccines.items || []), [vaccines.items])
  const prescriptionsByPatient = useMemo(() => groupByPatient(prescriptions.items || []), [prescriptions.items])
  const appointmentsByPatient = useMemo(() => groupByPatient(appointments.items || []), [appointments.items])

  const clinicalRows = (clinicalByPatient[effectivePatientId] || []).sort(byDateDesc)
  const vaccineRows = (vaccinesByPatient[effectivePatientId] || []).sort(byDateDesc)
  const prescriptionRows = (prescriptionsByPatient[effectivePatientId] || []).sort(byDateDesc)
  const appointmentRows = (appointmentsByPatient[effectivePatientId] || []).sort(byDateDesc)

  return (
    <main className="portal-shell">
      <header className="portal-header">
        <div className="brand">
          <div className="brand-mark">V+</div>
          <div>
            <strong>Portal de pacientes</strong>
            <small>Historia clínica visible para el tutor responsable</small>
          </div>
        </div>
        <div className="portal-session">
          <span>{user?.displayName || user?.email}</span>
          <button className="btn btn-ghost btn-small" onClick={logout}>Salir</button>
        </div>
      </header>

      <section className="portal-hero panel">
        <div>
          <p className="eyebrow">Acceso del tutor</p>
          <h1>Historial clínico de tus animales</h1>
          <p>
            Consultá fichas, atenciones, vacunas, recetas e indicaciones cargadas por la veterinaria. El portal es solo lectura.
          </p>
        </div>
        <div className="portal-hero-stats">
          <span><strong>{patientRows.length}</strong> pacientes</span>
          <span><strong>{clinicalRecords.items.length}</strong> atenciones</span>
          <span><strong>{vaccines.items.length}</strong> aplicaciones</span>
        </div>
      </section>

      {!clientIds.length && (
        <div className="alert alert-warning">
          Tu usuario no tiene un cliente vinculado. Pedile a la veterinaria que complete el campo clientId en tu perfil de usuario.
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="panel">Cargando historial...</div>}

      {!loading && !error && !patientRows.length && (
        <EmptyPortalState
          title="No hay pacientes vinculados"
          description="La cuenta está habilitada, pero todavía no tiene animales asociados al cliente responsable."
        />
      )}

      {!loading && !error && patientRows.length > 0 && (
        <section className="portal-grid">
          <aside className="portal-patient-list panel">
            <h2>Mis animales</h2>
            <div className="portal-patient-buttons">
              {patientRows.map((patient) => (
                <button
                  key={patient.id}
                  className={`portal-patient-button ${patient.id === effectivePatientId ? 'active' : ''}`}
                  onClick={() => setSelectedPatientId(patient.id)}
                  type="button"
                >
                  <strong>{patient.name}</strong>
                  <span>{[patient.species, patient.breed].filter(Boolean).join(' · ') || 'Sin datos de especie'}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="portal-detail">
            <article className="panel portal-patient-card">
              <div>
                <p className="eyebrow">Ficha del paciente</p>
                <h2>{selectedPatient.name}</h2>
                <p>{[selectedPatient.species, selectedPatient.breed, selectedPatient.sex].filter(Boolean).join(' · ') || 'Sin datos principales'}</p>
              </div>
              <div className="portal-patient-meta">
                <span><strong>Nacimiento:</strong> {dateLabel(selectedPatient.birthDate) || '-'}</span>
                <span><strong>Peso:</strong> {selectedPatient.weight ? `${selectedPatient.weight} kg` : '-'}</span>
                <span><strong>Microchip:</strong> {selectedPatient.chip || '-'}</span>
                <span><strong>Estado:</strong> {selectedPatient.status || '-'}</span>
              </div>
              {(selectedPatient.allergies || selectedPatient.alerts) && (
                <div className="portal-alert-box">
                  {selectedPatient.allergies && <span><strong>Alergias:</strong> {selectedPatient.allergies}</span>}
                  {selectedPatient.alerts && <span><strong>Alertas:</strong> {selectedPatient.alerts}</span>}
                </div>
              )}
            </article>

            <div className="portal-sections">
              <article className="panel portal-section-card">
                <h2>Atenciones clínicas</h2>
                {clinicalRows.length ? clinicalRows.map((row) => (
                  <TimelineItem key={row.id} title={row.type || 'Atención'} date={row.date} meta={row.professional || ''}>
                    {[row.reason, row.diagnosis, row.treatment].filter(Boolean).join(' · ')}
                  </TimelineItem>
                )) : <EmptyPortalState title="Sin atenciones cargadas" description="Todavía no hay consultas visibles para este paciente." />}
              </article>

              <article className="panel portal-section-card">
                <h2>Vacunas y antiparasitarios</h2>
                {vaccineRows.length ? vaccineRows.map((row) => (
                  <TimelineItem key={row.id} title={row.vaccine || 'Aplicación'} date={row.date} meta={row.status || ''}>
                    {[row.batch ? `Lote ${row.batch}` : '', row.nextDueDate ? `Próximo: ${dateLabel(row.nextDueDate)}` : '', row.notes].filter(Boolean).join(' · ')}
                  </TimelineItem>
                )) : <EmptyPortalState title="Sin vacunas cargadas" description="Todavía no hay aplicaciones visibles para este paciente." />}
              </article>

              <article className="panel portal-section-card">
                <h2>Recetas e indicaciones</h2>
                {prescriptionRows.length ? prescriptionRows.map((row) => (
                  <TimelineItem key={row.id} title={row.medication || 'Receta'} date={row.date} meta={row.professional || ''}>
                    {[row.diagnosis, row.instructions].filter(Boolean).join(' · ')}
                  </TimelineItem>
                )) : <EmptyPortalState title="Sin recetas cargadas" description="Todavía no hay recetas visibles para este paciente." />}
              </article>

              <article className="panel portal-section-card">
                <h2>Turnos</h2>
                {appointmentRows.length ? appointmentRows.map((row) => (
                  <TimelineItem key={row.id} title={row.service || 'Turno'} date={row.date} meta={[row.time, row.status].filter(Boolean).join(' · ')}>
                    {[row.professional, row.notes].filter(Boolean).join(' · ')}
                  </TimelineItem>
                )) : <EmptyPortalState title="Sin turnos cargados" description="No hay turnos visibles para este paciente." />}
              </article>
            </div>
          </section>
        </section>
      )}
    </main>
  )
}
