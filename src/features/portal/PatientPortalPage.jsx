import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { dateLabel } from '../../utils/formatters.js'
import { getClinicalPdfUrl } from '../../services/storage/clinicalFilesStorage.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { createPortalConsultationWithNotification, formatPatientSummary } from '../../services/notifications/notificationService.js'

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
  return String(b.createdAtISO || b.date || b.nextDueDate || '').localeCompare(String(a.createdAtISO || a.date || a.nextDueDate || ''))
}

function groupByPatient(rows) {
  return rows.reduce((acc, row) => {
    const key = row.patientId || 'sin-paciente'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})
}

function normalizePhoneForWhatsapp(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return `54${digits.slice(1)}`
  return `54${digits}`
}

function whatsappHref(value, patient) {
  const phone = normalizePhoneForWhatsapp(value)
  if (!phone) return ''
  const summary = patient ? formatPatientSummary(patient) : ''
  const text = encodeURIComponent(summary ? `Hola, quería consultar por este paciente: ${summary}.` : 'Hola, quería hacer una consulta.')
  return `https://wa.me/${phone}?text=${text}`
}

function EmptyPortalState({ title, description }) {
  return (
    <div className="portal-empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}

function TimelineItem({ title, date, meta, kind, file, openingFileId, onOpenFile, children }) {
  return (
    <article className="portal-timeline-item">
      <div>
        <strong>{title}</strong>
        <span>{dateLabel(date) || 'Sin fecha'}</span>
      </div>
      {(kind || meta) && <em>{[kind, meta].filter(Boolean).join(' · ')}</em>}
      {children && <p>{children}</p>}
      {file?.storagePath && (
        <button className="btn btn-small" type="button" onClick={() => onOpenFile(file)} disabled={openingFileId === file.id}>
          {openingFileId === file.id ? 'Abriendo...' : 'Ver PDF'}
        </button>
      )}
    </article>
  )
}


function PortalConsultationForm({ patient, user, onSaved }) {
  const feedback = useFeedback()
  const [form, setForm] = useState({
    reason: '',
    urgency: 'Normal',
    preferredChannel: 'WhatsApp',
    contactPhone: patient?.clientPhone || '',
    contactEmail: patient?.clientEmail || user?.email || '',
    message: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm((current) => ({
      ...current,
      contactPhone: patient?.clientPhone || current.contactPhone || '',
      contactEmail: patient?.clientEmail || user?.email || current.contactEmail || '',
    }))
  }, [patient?.id, patient?.clientPhone, patient?.clientEmail, user?.email])

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!patient?.id) return
    if (!String(form.reason || '').trim() && !String(form.message || '').trim()) {
      feedback.warning('Escribí un motivo o mensaje para enviar la consulta.')
      return
    }
    setSaving(true)
    try {
      await createPortalConsultationWithNotification({ user, patient, form })
      feedback.success('Consulta enviada a la veterinaria.')
      setForm((current) => ({ ...current, reason: '', message: '', urgency: 'Normal' }))
      onSaved?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo enviar la consulta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="panel portal-section-card portal-consultation-form-card">
      <div className="portal-section-title-row">
        <div>
          <p className="eyebrow">Consulta al equipo veterinario</p>
          <h2>Consultar por {patient?.name}</h2>
          <p>La consulta se envía con los datos del animal para que la veterinaria sepa exactamente por quién estás consultando.</p>
        </div>
      </div>

      <div className="portal-consultation-patient-box">
        <span><strong>Paciente:</strong> {patient?.name || '-'}</span>
        <span><strong>Datos:</strong> {formatPatientSummary(patient) || '-'}</span>
        <span><strong>Color:</strong> {patient?.color || '-'}</span>
        <span><strong>Castración:</strong> {patient?.castrationStatus || 'Indefinido'}</span>
        <span><strong>Microchip:</strong> {patient?.chip || '-'}</span>
        {patient?.allergies && <span><strong>Alergias:</strong> {patient.allergies}</span>}
        {patient?.alerts && <span><strong>Alertas:</strong> {patient.alerts}</span>}
      </div>

      <form className="portal-consultation-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Motivo de la consulta</span>
          <input value={form.reason} onChange={(event) => updateForm('reason', event.target.value)} placeholder="Ej: Tiene tos, control de análisis, duda sobre medicación..." />
        </label>
        <label className="field">
          <span>Urgencia</span>
          <select value={form.urgency} onChange={(event) => updateForm('urgency', event.target.value)}>
            <option>Normal</option>
            <option>Urgente</option>
            <option>Baja</option>
          </select>
        </label>
        <label className="field">
          <span>Canal preferido</span>
          <select value={form.preferredChannel} onChange={(event) => updateForm('preferredChannel', event.target.value)}>
            <option>WhatsApp</option>
            <option>Email</option>
            <option>Teléfono</option>
          </select>
        </label>
        <label className="field">
          <span>Teléfono de contacto</span>
          <input value={form.contactPhone} onChange={(event) => updateForm('contactPhone', event.target.value)} placeholder="Teléfono para respuesta" />
        </label>
        <label className="field">
          <span>Email de contacto</span>
          <input type="email" value={form.contactEmail} onChange={(event) => updateForm('contactEmail', event.target.value)} placeholder="Email para respuesta" />
        </label>
        <label className="field field-textarea portal-consultation-message">
          <span>Mensaje</span>
          <textarea rows={5} value={form.message} onChange={(event) => updateForm('message', event.target.value)} placeholder="Describí qué está pasando, desde cuándo, medicación actual o cualquier detalle importante." />
        </label>
        <div className="portal-consultation-submit">
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Enviando...' : 'Enviar consulta'}</button>
        </div>
      </form>
    </article>
  )
}

function buildUnifiedTimeline({ clinicalRows, vaccineRows, prescriptionRows, appointmentRows, fileRows }) {
  const clinicalSourceKeys = new Set(
    clinicalRows
      .filter((row) => row.source && row.sourceId)
      .map((row) => `${row.source}:${row.sourceId}`),
  )

  return [
    ...clinicalRows.map((row) => ({
      id: `clinical-${row.id}`,
      kind: row.type || 'Atención',
      title: row.reason || row.title || row.type || 'Visita clínica',
      date: row.date,
      meta: row.professional ? `Atendió: ${row.professional}` : '',
      detail: [row.diagnosis ? `Diagnóstico: ${row.diagnosis}` : '', row.prescriptionText ? `Medicación: ${row.prescriptionText}` : '', row.indications ? `${row.source === 'vaccines' ? 'Prevención' : row.source === 'prescriptions' ? 'Indicaciones' : 'Plan clínico'}: ${row.indications}` : '', row.notes].filter(Boolean).join(' · '),
    })),
    ...vaccineRows
      .filter((row) => !row.clinicalRecordId && !clinicalSourceKeys.has(`vaccines:${row.id}`))
      .map((row) => ({
        id: `vaccine-${row.id}`,
        kind: 'Vacuna',
        title: row.vaccine || 'Aplicación sanitaria',
        date: row.date,
        meta: row.status || '',
        detail: [row.batch ? `Lote ${row.batch}` : '', row.nextDueDate ? `Próximo: ${dateLabel(row.nextDueDate)}` : ''].filter(Boolean).join(' · '),
      })),
    ...prescriptionRows
      .filter((row) => !row.clinicalRecordId && !clinicalSourceKeys.has(`prescriptions:${row.id}`))
      .map((row) => ({
        id: `prescription-${row.id}`,
        kind: 'Receta',
        title: row.medication || 'Receta / indicación',
        date: row.date,
        meta: row.professional || '',
        detail: [row.instructions ? `Indicaciones: ${row.instructions}` : '', row.notes].filter(Boolean).join(' · '),
      })),
    ...appointmentRows.map((row) => ({
      id: `appointment-${row.id}`,
      kind: 'Turno',
      title: row.service || row.reason || 'Turno',
      date: row.date,
      meta: [row.time, row.status].filter(Boolean).join(' · '),
      detail: [row.professional, row.notes].filter(Boolean).join(' · '),
    })),
    ...fileRows.map((row) => ({
      id: `file-${row.id}`,
      kind: 'Documento PDF',
      title: row.title || row.fileName || 'Documento clínico',
      date: row.date,
      meta: row.documentType || '',
      detail: [row.notes, row.fileName].filter(Boolean).join(' · '),
      file: row,
    })),
  ].sort(byDateDesc)
}

export function PatientPortalPage() {
  const { user, logout } = useAuth()
  const clinicSettings = useClinicSettings()
  const clientIds = useMemo(() => normalizeClientIds(user), [user])
  const where = useMemo(() => clientWhere(clientIds), [clientIds])
  const patients = useCollection('patients', { where, limitCount: 100, orderByField: 'name', orderDirection: 'asc' })
  const clinicalRecords = useCollection('clinicalRecords', { where, limitCount: 200, orderByField: 'date', orderDirection: 'desc' })
  const vaccines = useCollection('vaccines', { where, limitCount: 200, orderByField: 'date', orderDirection: 'desc' })
  const prescriptions = useCollection('prescriptions', { where, limitCount: 200, orderByField: 'date', orderDirection: 'desc' })
  const appointments = useCollection('appointments', { where, limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const fileWhere = useMemo(() => [...where, { field: 'visibleInPortal', op: '==', value: true }, { field: 'uploadStatus', op: '==', value: 'ready' }], [where])
  const clinicalFiles = useCollection('clinicalFiles', { where: fileWhere, limitCount: 200 })
  const consultationWhere = useMemo(() => [...where], [where])
  const portalConsultations = useCollection('portalConsultations', { where: consultationWhere, limitCount: 50 })
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [openingFileId, setOpeningFileId] = useState('')

  const loading = patients.loading || clinicalRecords.loading || vaccines.loading || prescriptions.loading || appointments.loading || clinicalFiles.loading || portalConsultations.loading
  const error = patients.error || clinicalRecords.error || vaccines.error || prescriptions.error || appointments.error || clinicalFiles.error || portalConsultations.error
  const patientRows = patients.items || []
  const selectedPatient = patientRows.find((item) => item.id === selectedPatientId) || patientRows[0] || null
  const effectivePatientId = selectedPatient?.id || ''
  const contactWhatsapp = whatsappHref(clinicSettings.whatsapp || clinicSettings.phone, selectedPatient)

  const clinicalByPatient = useMemo(() => groupByPatient(clinicalRecords.items || []), [clinicalRecords.items])
  const vaccinesByPatient = useMemo(() => groupByPatient(vaccines.items || []), [vaccines.items])
  const prescriptionsByPatient = useMemo(() => groupByPatient(prescriptions.items || []), [prescriptions.items])
  const appointmentsByPatient = useMemo(() => groupByPatient(appointments.items || []), [appointments.items])
  const filesByPatient = useMemo(() => groupByPatient(clinicalFiles.items || []), [clinicalFiles.items])
  const consultationsByPatient = useMemo(() => groupByPatient(portalConsultations.items || []), [portalConsultations.items])

  const clinicalRows = (clinicalByPatient[effectivePatientId] || []).sort(byDateDesc)
  const vaccineRows = (vaccinesByPatient[effectivePatientId] || []).sort(byDateDesc)
  const prescriptionRows = (prescriptionsByPatient[effectivePatientId] || []).sort(byDateDesc)
  const appointmentRows = (appointmentsByPatient[effectivePatientId] || []).sort(byDateDesc)
  const fileRows = (filesByPatient[effectivePatientId] || []).sort(byDateDesc)
  const consultationRows = (consultationsByPatient[effectivePatientId] || []).sort(byDateDesc)
  const unifiedTimeline = buildUnifiedTimeline({ clinicalRows, vaccineRows, prescriptionRows, appointmentRows, fileRows })

  async function handleOpenClinicalFile(file) {
    setOpeningFileId(file?.id || '')
    try {
      const url = await getClinicalPdfUrl(file.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setOpeningFileId('')
    }
  }

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
          {contactWhatsapp && (
            <a className="btn btn-whatsapp btn-small" href={contactWhatsapp} target="_blank" rel="noreferrer">
              WhatsApp veterinaria
            </a>
          )}
          <span>{user?.displayName || user?.email}</span>
          <button className="btn btn-ghost btn-small" onClick={logout}>Salir</button>
        </div>
      </header>

      <section className="portal-hero panel">
        <div>
          <p className="eyebrow">Acceso del tutor</p>
          <h1>Historial clínico de tus animales</h1>
          <p>
            Cada animal tiene su propio portal con ficha, atenciones, vacunas, recetas, indicaciones y turnos en una sola historia.
          </p>
        </div>
        <div className="portal-hero-stats">
          <span><strong>{patientRows.length}</strong> pacientes</span>
          <span><strong>{clinicalRecords.items.length}</strong> eventos clínicos</span>
          <span><strong>{vaccines.items.length}</strong> aplicaciones</span>
          <span><strong>{clinicalFiles.items.length}</strong> documentos</span>
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
              <div className="portal-patient-title-row">
                <div>
                  <p className="eyebrow">Ficha del paciente</p>
                  <h2>{selectedPatient.name}</h2>
                  <p>{[selectedPatient.species, selectedPatient.breed, selectedPatient.sex].filter(Boolean).join(' · ') || 'Sin datos principales'}</p>
                </div>
                {contactWhatsapp && (
                  <a className="btn btn-whatsapp" href={contactWhatsapp} target="_blank" rel="noreferrer">
                    Consultar por WhatsApp
                  </a>
                )}
              </div>
              <div className="portal-patient-meta">
                <span><strong>Nacimiento:</strong> {dateLabel(selectedPatient.birthDate) || '-'}</span>
                <span><strong>Peso:</strong> {selectedPatient.weight ? `${selectedPatient.weight} kg` : '-'}</span>
                <span><strong>Color:</strong> {selectedPatient.color || '-'}</span>
                <span><strong>Castración:</strong> {selectedPatient.castrationStatus || 'Indefinido'}</span>
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

            <PortalConsultationForm patient={selectedPatient} user={user} onSaved={portalConsultations.refresh} />

            <article className="panel portal-section-card portal-main-history">
              <div className="portal-section-title-row">
                <div>
                  <p className="eyebrow">Historia clínica unificada</p>
                  <h2>Todo lo cargado para {selectedPatient.name}</h2>
                </div>
                <span className="badge tone-info">{unifiedTimeline.length} eventos</span>
              </div>
              {unifiedTimeline.length ? unifiedTimeline.map((row) => (
                <TimelineItem key={row.id} title={row.title} date={row.date} kind={row.kind} meta={row.meta} file={row.file} openingFileId={openingFileId} onOpenFile={handleOpenClinicalFile}>
                  {row.detail}
                </TimelineItem>
              )) : <EmptyPortalState title="Sin historia cargada" description="Todavía no hay atenciones, vacunas, recetas ni turnos visibles para este paciente." />}
            </article>

            <div className="portal-sections">
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
                    {[row.instructions, row.notes].filter(Boolean).join(' · ')}
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

              <article className="panel portal-section-card">
                <h2>Consultas enviadas</h2>
                {consultationRows.length ? consultationRows.map((row) => (
                  <TimelineItem key={row.id} title={row.subject || row.reason || 'Consulta enviada'} date={row.createdAtISO || row.date} meta={[row.status, row.urgency].filter(Boolean).join(' · ')}>
                    {[row.message, row.preferredChannel ? `Canal: ${row.preferredChannel}` : ''].filter(Boolean).join(' · ')}
                  </TimelineItem>
                )) : <EmptyPortalState title="Sin consultas enviadas" description="Desde este portal podés mandar consultas indicando el animal correspondiente." />}
              </article>

              <article className="panel portal-section-card">
                <h2>Documentos clínicos PDF</h2>
                {fileRows.length ? fileRows.map((row) => (
                  <TimelineItem key={row.id} title={row.title || row.fileName || 'Documento clínico'} date={row.date} meta={row.documentType || ''} file={row} openingFileId={openingFileId} onOpenFile={handleOpenClinicalFile}>
                    {[row.notes, row.fileName].filter(Boolean).join(' · ')}
                  </TimelineItem>
                )) : <EmptyPortalState title="Sin documentos visibles" description="La veterinaria todavía no compartió documentos PDF para este paciente." />}
              </article>
            </div>
          </section>
        </section>
      )}
    </main>
  )
}
