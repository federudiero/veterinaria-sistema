import React, { useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { dateLabel } from '../../utils/formatters.js'
import { buildEmailDraftFromConsultation, mailtoHref, nowISO, todayISO } from '../../services/notifications/notificationService.js'

const NOTIFICATION_STATUS = ['No leída', 'Leída', 'Archivada']
const EMAIL_STATUS = ['Borrador', 'Pendiente', 'Enviado', 'Error']

function asDateTime(value) {
  if (!value) return '-'
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return dateLabel(value)
  try {
    return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function buildClientOptions(clients = []) {
  return clients.map((client) => ({
    value: client.id,
    label: [client.name, client.email, client.phone].filter(Boolean).join(' · '),
  }))
}

function patientDetail(row = {}) {
  return [row.patientName, row.patientSpecies, row.patientBreed, row.patientSex, row.patientWeight ? `${row.patientWeight} kg` : '']
    .filter(Boolean)
    .join(' · ')
}

function ConsultationCard({ row, onEmail }) {
  return (
    <article className="portal-consultation-card">
      <div className="portal-consultation-card-head">
        <div>
          <strong>{row.subject || row.reason || 'Consulta del tutor'}</strong>
          <span>{asDateTime(row.createdAtISO || row.date)}</span>
        </div>
        <span className={`badge tone-${row.urgency === 'Urgente' ? 'danger' : row.urgency === 'Baja' ? 'info' : 'warning'}`}>{row.urgency || 'Normal'}</span>
      </div>
      <div className="portal-consultation-meta">
        <span><b>Tutor:</b> {row.clientName || '-'}</span>
        <span><b>Email:</b> {row.contactEmail || row.clientEmail || '-'}</span>
        <span><b>Teléfono:</b> {row.contactPhone || '-'}</span>
        <span><b>Paciente:</b> {patientDetail(row) || '-'}</span>
        <span><b>Castración:</b> {row.patientCastrationStatus || '-'}</span>
        <span><b>Chip:</b> {row.patientChip || '-'}</span>
      </div>
      {(row.patientAllergies || row.patientAlerts) && (
        <div className="portal-consultation-alerts">
          {row.patientAllergies && <span><b>Alergias:</b> {row.patientAllergies}</span>}
          {row.patientAlerts && <span><b>Alertas:</b> {row.patientAlerts}</span>}
        </div>
      )}
      <p>{row.message || 'Sin mensaje detallado.'}</p>
      <div className="portal-consultation-actions">
        <button type="button" className="btn btn-small" onClick={() => onEmail(row)}>Preparar email</button>
      </div>
    </article>
  )
}

export function NotificationsPage() {
  const { hasPermission, user } = useAuth()
  const feedback = useFeedback()
  const clinicSettings = useClinicSettings()
  const canRead = hasPermission('notificaciones.read')
  const canWrite = hasPermission('notificaciones.write')
  const notifications = useCollection('notifications', { limitCount: 150, orderByField: 'createdAtISO', orderDirection: 'desc' })
  const consultations = useCollection('portalConsultations', { limitCount: 100, orderByField: 'createdAtISO', orderDirection: 'desc' })
  const emailOutbox = useCollection('emailOutbox', { limitCount: 100, orderByField: 'createdAtISO', orderDirection: 'desc' })
  const clients = useCollection('clients', { limitCount: 300, orderByField: 'name', orderDirection: 'asc' })
  const [tab, setTab] = useState('notificaciones')
  const [emailForm, setEmailForm] = useState({ clientId: '', to: '', subject: '', body: '', status: 'Pendiente' })

  const clientOptions = useMemo(() => buildClientOptions(clients.items || []), [clients.items])
  const clientById = useMemo(() => Object.fromEntries((clients.items || []).map((client) => [client.id, client])), [clients.items])

  const unreadCount = (notifications.items || []).filter((item) => item.status !== 'Leída' && item.status !== 'Archivada').length
  const pendingEmailCount = (emailOutbox.items || []).filter((item) => item.status !== 'Enviado' && item.status !== 'Archivado').length

  function updateEmailForm(name, value) {
    if (name === 'clientId') {
      const client = clientById[value] || {}
      setEmailForm((current) => ({
        ...current,
        clientId: value,
        to: client.email || current.to || '',
      }))
      return
    }
    setEmailForm((current) => ({ ...current, [name]: value }))
  }

  function prepareEmailFromConsultation(row) {
    const draft = buildEmailDraftFromConsultation(row, clinicSettings)
    setEmailForm({
      clientId: row.clientId || '',
      to: row.contactEmail || row.clientEmail || '',
      subject: draft.subject,
      body: draft.body,
      status: 'Pendiente',
      source: 'portalConsultations',
      sourceId: row.id,
    })
    setTab('email')
  }

  async function markNotification(row, status) {
    if (!canWrite || !row?.id) return
    try {
      await notifications.update(row.id, {
        status,
        readAtISO: status === 'Leída' ? nowISO() : row.readAtISO || '',
        archivedAtISO: status === 'Archivada' ? nowISO() : row.archivedAtISO || '',
      })
      feedback.success('Notificación actualizada.')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo actualizar la notificación.')
    }
  }

  async function saveEmailDraft(openMailClient = false) {
    if (!canWrite) return
    const to = String(emailForm.to || '').trim()
    const subject = String(emailForm.subject || '').trim()
    const body = String(emailForm.body || '').trim()
    if (!to || !subject || !body) {
      feedback.warning('Completá destinatario, asunto y mensaje.')
      return
    }
    const client = clientById[emailForm.clientId] || {}
    try {
      await emailOutbox.create({
        date: todayISO(),
        createdAtISO: nowISO(),
        status: emailForm.status || 'Pendiente',
        to,
        subject,
        body,
        clientId: emailForm.clientId || '',
        clientName: client.name || '',
        source: emailForm.source || 'manual',
        sourceId: emailForm.sourceId || '',
        createdByUid: user?.uid || '',
        createdByEmail: user?.email || '',
        provider: 'pending-backend',
      })
      feedback.success(openMailClient ? 'Email guardado. Se abre tu cliente de correo.' : 'Email guardado en bandeja pendiente.')
      if (openMailClient) window.location.href = mailtoHref({ to, subject, body })
      setEmailForm({ clientId: '', to: '', subject: '', body: '', status: 'Pendiente' })
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el email.')
    }
  }

  async function updateEmailStatus(row, status) {
    if (!canWrite || !row?.id) return
    try {
      await emailOutbox.update(row.id, {
        status,
        sentAtISO: status === 'Enviado' ? nowISO() : row.sentAtISO || '',
      })
      feedback.success('Estado de email actualizado.')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo actualizar el email.')
    }
  }

  if (!canRead) {
    return (
      <section>
        <SectionHeader eyebrow="Sistema" title="Notificaciones" description="No tenés permisos para ver notificaciones." />
      </section>
    )
  }

  return (
    <section className="notifications-page">
      <SectionHeader
        eyebrow="Sistema"
        title="Notificaciones y emails"
        description="Consultas del portal, avisos internos y bandeja de emails lista para conectar con un proveedor de envío."
      />

      <div className="notification-summary-grid">
        <div className="panel notification-summary-card">
          <span>Sin leer</span>
          <strong>{unreadCount}</strong>
          <small>Notificaciones internas pendientes.</small>
        </div>
        <div className="panel notification-summary-card">
          <span>Consultas portal</span>
          <strong>{consultations.items.length}</strong>
          <small>Mensajes enviados por tutores desde el portal.</small>
        </div>
        <div className="panel notification-summary-card">
          <span>Emails pendientes</span>
          <strong>{pendingEmailCount}</strong>
          <small>Bandeja preparada para envío manual o backend.</small>
        </div>
      </div>

      <div className="module-tabs ops-center-tabs notification-tabs" role="tablist" aria-label="Notificaciones y email">
        <button type="button" className={`module-tab ${tab === 'notificaciones' ? 'active' : ''}`} onClick={() => setTab('notificaciones')}>
          <strong>Notificaciones</strong>
          <small>Avisos internos y consultas recientes.</small>
        </button>
        <button type="button" className={`module-tab ${tab === 'consultas' ? 'active' : ''}`} onClick={() => setTab('consultas')}>
          <strong>Consultas del portal</strong>
          <small>Incluye datos completos del animal consultado.</small>
        </button>
        <button type="button" className={`module-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>
          <strong>Email al cliente</strong>
          <small>Crear email pendiente o abrir cliente de correo.</small>
        </button>
      </div>

      {tab === 'notificaciones' && (
        <div className="panel">
          <DataTable
            rows={notifications.items || []}
            columns={[
              { key: 'createdAtISO', label: 'Fecha', render: (row) => asDateTime(row.createdAtISO || row.date) },
              { key: 'status', label: 'Estado', render: (row) => <span className={`badge tone-${row.status === 'No leída' ? 'warning' : 'info'}`}>{row.status || '-'}</span> },
              { key: 'priority', label: 'Prioridad', render: (row) => <span className={`badge tone-${row.priority === 'Alta' ? 'danger' : row.priority === 'Baja' ? 'info' : 'warning'}`}>{row.priority || 'Media'}</span> },
              { key: 'title', label: 'Título' },
              { key: 'patientName', label: 'Paciente', render: (row) => patientDetail(row) || '-' },
              { key: 'clientName', label: 'Tutor' },
              { key: 'message', label: 'Detalle' },
            ]}
            empty="No hay notificaciones."
            actions={(row) => (
              <>
                {canWrite && row.status !== 'Leída' && <button type="button" className="btn btn-small" onClick={() => markNotification(row, 'Leída')}>Leída</button>}
                {canWrite && row.status !== 'Archivada' && <button type="button" className="btn btn-small btn-ghost" onClick={() => markNotification(row, 'Archivada')}>Archivar</button>}
              </>
            )}
          />
        </div>
      )}

      {tab === 'consultas' && (
        <div className="portal-consultations-list">
          {(consultations.items || []).length ? consultations.items.map((row) => (
            <ConsultationCard key={row.id} row={row} onEmail={prepareEmailFromConsultation} />
          )) : (
            <div className="panel empty-state-card">
              <h2>No hay consultas del portal</h2>
              <p className="muted">Cuando un tutor envíe una consulta desde su portal, aparecerá acá con la ficha del animal.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'email' && (
        <div className="two-column two-column-wide">
          <div className="panel">
            <h2>Preparar email al cliente</h2>
            <p className="muted">Esto deja el email guardado en <strong>emailOutbox</strong>. Hasta conectar un backend de envío, podés abrirlo con el correo de la computadora.</p>
            <FormGrid
              value={emailForm}
              onChange={updateEmailForm}
              fields={[
                { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: false, searchPlaceholder: 'Buscar cliente...' },
                { name: 'to', label: 'Email destino', type: 'email', required: true },
                { name: 'subject', label: 'Asunto', required: true },
                { name: 'body', label: 'Mensaje', type: 'textarea', rows: 10, required: true },
                { name: 'status', label: 'Estado', type: 'select', searchable: false, options: EMAIL_STATUS },
              ]}
            />
            <div className="patient-history-form-actions">
              <button type="button" className="btn btn-primary" onClick={() => saveEmailDraft(false)} disabled={!canWrite}>Guardar pendiente</button>
              <button type="button" className="btn" onClick={() => saveEmailDraft(true)} disabled={!canWrite}>Guardar y abrir email</button>
            </div>
          </div>

          <div className="panel">
            <h2>Bandeja de emails</h2>
            <DataTable
              rows={emailOutbox.items || []}
              columns={[
                { key: 'createdAtISO', label: 'Fecha', render: (row) => asDateTime(row.createdAtISO || row.date) },
                { key: 'status', label: 'Estado', render: (row) => <span className="badge tone-info">{row.status || '-'}</span> },
                { key: 'to', label: 'Destino' },
                { key: 'subject', label: 'Asunto' },
                { key: 'clientName', label: 'Cliente' },
              ]}
              empty="No hay emails preparados."
              actions={(row) => (
                <>
                  <a className="btn btn-small" href={mailtoHref({ to: row.to, subject: row.subject, body: row.body })}>Abrir</a>
                  {canWrite && NOTIFICATION_STATUS && <button type="button" className="btn btn-small btn-ghost" onClick={() => updateEmailStatus(row, 'Enviado')}>Marcar enviado</button>}
                </>
              )}
            />
          </div>
        </div>
      )}
    </section>
  )
}
