import React, { useId, useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { IndividualExportActions } from '../../components/export/IndividualExportActions.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useLookups } from '../../hooks/useLookups.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { buildSearchPayload, normalizeSearchText } from '../../utils/search.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'

const STATUS_OPTIONS = ['Pendiente', 'Confirmado', 'En sala', 'Atendido', 'Cancelado', 'No asistió']
const REMINDER_OPTIONS = ['Sin recordatorio', 'WhatsApp 24 h antes', 'Email', 'Llamada']
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function toDateAtNoon(isoDate) {
  const [year, month, day] = String(isoDate || todayISO()).split('-').map(Number)
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1, 12, 0, 0)
}

function formatISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date)
}

function buildCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0)
  const last = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 12, 0, 0)
  const mondayBasedStart = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - mondayBasedStart)

  const days = []
  for (let index = 0; index < 42; index += 1) {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    days.push({
      iso: formatISODate(current),
      dayNumber: current.getDate(),
      currentMonth: current.getMonth() === monthDate.getMonth(),
    })
  }
  return days
}

function statusTone(status) {
  if (status === 'Atendido') return 'success'
  if (status === 'Cancelado' || status === 'No asistió') return 'danger'
  if (status === 'En sala') return 'warning'
  if (status === 'Confirmado') return 'info'
  return 'default'
}

function rowSearch(row, clientMap, patientMap) {
  return normalizeSearchText([
    row.time,
    row.service,
    row.professional,
    row.status,
    row.notes,
    clientMap[row.clientId],
    patientMap[row.patientId],
  ].filter(Boolean).join(' '))
}

const initialForm = {
  date: todayISO(),
  time: '09:00',
  clientId: '',
  patientId: '',
  professional: '',
  service: '',
  status: 'Pendiente',
  reminder: 'WhatsApp 24 h antes',
  notes: '',
}

export function AppointmentsPage() {
  const appointments = useCollection('appointments', { limitCount: 300, orderByField: 'date', orderDirection: 'desc' })
  const { clientOptions, patientOptions, clientMap, patientMap, clientById, patientById } = useLookups()
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [monthDate, setMonthDate] = useState(toDateAtNoon(todayISO()))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const formId = useId()
  const feedback = useFeedback()
  const { hasPermission } = useAuth()
  const canRead = hasPermission('agenda.read')
  const canWrite = hasPermission('agenda.write')

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const appointmentsByDate = useMemo(() => {
    return appointments.items.reduce((acc, item) => {
      const date = item.date || ''
      if (!date) return acc
      if (!acc[date]) acc[date] = []
      acc[date].push(item)
      return acc
    }, {})
  }, [appointments.items])

  const selectedRows = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    return (appointmentsByDate[selectedDate] || [])
      .filter((item) => !statusFilter || item.status === statusFilter)
      .filter((item) => !normalizedQuery || rowSearch(item, clientMap, patientMap).includes(normalizedQuery))
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
  }, [appointmentsByDate, selectedDate, statusFilter, query, clientMap, patientMap])

  const dailySummary = useMemo(() => {
    const allRows = appointmentsByDate[selectedDate] || []
    return {
      total: allRows.length,
      pending: allRows.filter((item) => item.status === 'Pendiente').length,
      confirmed: allRows.filter((item) => item.status === 'Confirmado').length,
      done: allRows.filter((item) => item.status === 'Atendido').length,
    }
  }, [appointmentsByDate, selectedDate])

  const columns = [
    { key: 'time', label: 'Hora' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'service', label: 'Servicio' },
    { key: 'professional', label: 'Profesional' },
    { key: 'status', label: 'Estado', render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status || 'Pendiente'}</StatusBadge> },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
      ...columns,
      { key: 'reminder', label: 'Recordatorio' },
      { key: 'notes', label: 'Notas' },
    ],
  })

  function selectDate(iso) {
    setSelectedDate(iso)
    setMonthDate(new Date(toDateAtNoon(iso).getFullYear(), toDateAtNoon(iso).getMonth(), 1, 12, 0, 0))
  }

  function moveMonth(offset) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0))
  }

  function openCreate(date = selectedDate) {
    if (!canWrite) {
      feedback.warning('No tenés permiso para crear turnos.')
      return
    }
    setEditing(null)
    setForm({ ...initialForm, date })
    setModalOpen(true)
  }

  function openEdit(row) {
    if (!canWrite) {
      feedback.warning('No tenés permiso para editar turnos.')
      return
    }
    setEditing(row)
    setForm({ ...initialForm, ...row })
    setModalOpen(true)
  }

  function handleChange(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveAppointment(event) {
    event.preventDefault()
    if (!canWrite) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        clientName: clientMap[form.clientId] || '',
        patientName: patientMap[form.patientId] || '',
      }
      const indexedPayload = { ...payload, ...buildSearchPayload(payload, ['date', 'time', 'service', 'professional', 'status', 'notes', 'clientName', 'patientName']) }
      if (editing) await appointments.update(editing.id, indexedPayload)
      else await appointments.create(indexedPayload)
      feedback.success(editing ? 'El turno se actualizó correctamente.' : 'El turno se creó correctamente.')
      setSelectedDate(indexedPayload.date || selectedDate)
      setModalOpen(false)
      appointments.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el turno.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteAppointment(row) {
    if (!canWrite) return
    const ok = await feedback.confirm({
      title: 'Eliminar turno',
      message: `¿Eliminar el turno de ${clientMap[row.clientId] || 'este cliente'} del ${dateLabel(row.date)} a las ${row.time || '-'}?`,
      confirmText: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await appointments.remove(row.id)
      feedback.success('El turno fue eliminado correctamente.')
      appointments.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo eliminar el turno.')
    }
  }

  if (!canRead) {
    return (
      <section className="access-denied-panel">
        <div className="system-card system-card-danger">
          <div className="system-icon">!</div>
          <p className="eyebrow">Acceso restringido</p>
          <h1>No tenés permiso para ver la agenda</h1>
          <p>Solicitá acceso a un administrador del sistema.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Agenda"
        title="Turnos"
        description="Agenda con calendario mensual, vista diaria y carga rápida de turnos. Optimizada para computadora y celular."
        actions={
          <>
            <ExportButtons
              title={`Agenda ${dateLabel(selectedDate)}`}
              subtitle="Turnos filtrados por el día seleccionado."
              rows={selectedRows}
              columns={exportColumns}
              summary={[
                { label: 'Día', value: dateLabel(selectedDate) },
                { label: 'Turnos visibles', value: selectedRows.length },
              ]}
              fileLabel="agenda-turnos"
            />
            {canWrite && <button className="btn btn-primary" onClick={() => openCreate(selectedDate)}>Nuevo turno</button>}
          </>
        }
      />

      <div className="agenda-grid">
        <article className="panel agenda-calendar-panel">
          <div className="calendar-toolbar">
            <button className="btn btn-small" type="button" onClick={() => moveMonth(-1)}>Anterior</button>
            <div>
              <strong>{monthLabel(monthDate)}</strong>
              <span>{dateLabel(selectedDate)}</span>
            </div>
            <button className="btn btn-small" type="button" onClick={() => moveMonth(1)}>Siguiente</button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-month" role="grid" aria-label="Calendario de turnos">
            {calendarDays.map((day) => {
              const rows = appointmentsByDate[day.iso] || []
              const isSelected = day.iso === selectedDate
              const isToday = day.iso === todayISO()
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={`calendar-day ${day.currentMonth ? '' : 'muted-day'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => selectDate(day.iso)}
                >
                  <span className="calendar-day-number">{day.dayNumber}</span>
                  {rows.length > 0 && <strong>{rows.length}</strong>}
                  {rows.slice(0, 2).map((item) => <em key={item.id}>{item.time || '--:--'} {item.service || 'Turno'}</em>)}
                </button>
              )
            })}
          </div>

          <div className="calendar-footer-actions">
            <button className="btn btn-small" type="button" onClick={() => selectDate(todayISO())}>Hoy</button>
            {canWrite && <button className="btn btn-small btn-primary" type="button" onClick={() => openCreate(selectedDate)}>Agregar en este día</button>}
          </div>
        </article>

        <aside className="agenda-day-panel">
          <div className="stats-grid compact agenda-stats">
            <div className="stat-card"><span>Total del día</span><strong>{dailySummary.total}</strong></div>
            <div className="stat-card tone-info"><span>Confirmados</span><strong>{dailySummary.confirmed}</strong></div>
            <div className="stat-card tone-warning"><span>Pendientes</span><strong>{dailySummary.pending}</strong></div>
            <div className="stat-card tone-success"><span>Atendidos</span><strong>{dailySummary.done}</strong></div>
          </div>

          <div className="panel agenda-filter-panel">
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, paciente, servicio..."
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </aside>
      </div>

      {appointments.error && <div className="alert alert-danger">{appointments.error}</div>}
      {appointments.loading ? (
        <div className="panel">Cargando agenda...</div>
      ) : (
        <DataTable
          rows={selectedRows}
          columns={columns}
          empty={`No hay turnos para el ${dateLabel(selectedDate)}.`}
          actions={(row) => (
            <>
              <IndividualExportActions
                row={row}
                columns={exportColumns}
                title="Turno"
                subtitle="Detalle individual del turno seleccionado."
                fileLabel="turno"
              />
              {canWrite && <button className="btn btn-small" onClick={() => openEdit(row)}>Editar</button>}
              {canWrite && <button className="btn btn-small btn-danger" onClick={() => deleteAppointment(row)}>Eliminar</button>}
            </>
          )}
        />
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Editar turno' : 'Nuevo turno'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={formId} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar turno'}
              </button>
            </>
          }
        >
          <form id={formId} onSubmit={saveAppointment}>
            <FormGrid
              value={form}
              onChange={handleChange}
              fields={[
                { name: 'date', label: 'Fecha', type: 'date', required: true },
                { name: 'time', label: 'Hora', type: 'time', required: true },
                { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true },
                { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions, required: true },
                { name: 'professional', label: 'Profesional' },
                { name: 'service', label: 'Servicio' },
                { name: 'status', label: 'Estado', type: 'select', options: STATUS_OPTIONS },
                { name: 'reminder', label: 'Recordatorio', type: 'select', options: REMINDER_OPTIONS },
                { name: 'notes', label: 'Notas', type: 'textarea', rows: 4 },
              ]}
            />
          </form>
        </Modal>
      )}
    </section>
  )
}
