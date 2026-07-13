import React, { useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useDataControls } from '../../hooks/useDataControls.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { buildSearchPayload } from '../../utils/search.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const STATUS_OPTIONS = ['Pendiente', 'Confirmado', 'Realizado', 'Cancelado', 'No asistió']
const DEFAULT_REMINDER_LEAD_DAYS = 1
const TEMPLATE_VARIABLES = [
  { token: '{tutor}', label: 'Nombre del tutor' },
  { token: '{mascota}', label: 'Mascota' },
  { token: '{fecha}', label: 'Fecha' },
  { token: '{hora}', label: 'Hora' },
  { token: '{raza}', label: 'Raza' },
  { token: '{kilos}', label: 'Kilos' },
]

const initialForm = {
  date: todayISO(),
  time: '09:00',
  tutorName: '',
  petName: '',
  breed: '',
  weightKg: '',
  phone: '',
}

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

function addDays(isoDate, amount) {
  const date = toDateAtNoon(isoDate)
  date.setDate(date.getDate() + amount)
  return formatISODate(date)
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date)
}

function buildCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0)
  const mondayBasedStart = (first.getDay() + 6) % 7
  const start = new Date(first)
  start.setDate(first.getDate() - mondayBasedStart)

  return Array.from({ length: 42 }, (_item, index) => {
    const current = new Date(start)
    current.setDate(start.getDate() + index)
    return {
      iso: formatISODate(current),
      dayNumber: current.getDate(),
      currentMonth: current.getMonth() === monthDate.getMonth(),
    }
  })
}

function statusTone(status) {
  if (status === 'Realizado') return 'success'
  if (status === 'Confirmado') return 'info'
  if (status === 'Cancelado' || status === 'No asistió') return 'danger'
  return 'warning'
}

function weightLabel(value) {
  const normalized = String(value ?? '').trim()
  return normalized ? `${normalized} kg` : '-'
}

function normalizeArgentineWhatsAppPhone(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (digits.startsWith('549')) return digits
  if (digits.startsWith('54')) return `549${digits.slice(2)}`
  if (digits.length === 10) return `549${digits}`
  return digits
}

function applyReminderTemplate(template, appointment) {
  const replacements = {
    tutor: appointment.tutorName || '',
    mascota: appointment.petName || '',
    fecha: dateLabel(appointment.date),
    hora: appointment.time || '',
    raza: appointment.breed || '',
    kilos: appointment.weightKg || '',
    telefono: appointment.phone || '',
  }

  return Object.entries(replacements).reduce(
    (message, [key, value]) => message.replaceAll(`{${key}}`, String(value)),
    String(template || '').trim(),
  )
}

function notifyGroomingAppointmentsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('grooming-appointments-changed'))
}

function buildWhatsAppUrl(appointment, template) {
  const phone = normalizeArgentineWhatsAppPhone(appointment.phone)
  const message = applyReminderTemplate(template, appointment)
  if (!phone || !message) return ''
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function GroomingPage() {
  const feedback = useFeedback()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'recordatorios' ? 'recordatorios' : 'agenda'
  const { hasPermission } = useAuth()
  const canRead = hasPermission('agenda.read')
  const canWrite = hasPermission('agenda.write')

  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [monthDate, setMonthDate] = useState(toDateAtNoon(todayISO()))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)
  const formId = useId()

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const monthRange = useMemo(() => ({
    start: calendarDays[0]?.iso || selectedDate,
    end: calendarDays.at(-1)?.iso || selectedDate,
  }), [calendarDays, selectedDate])

  const availability = useCollection('groomingAvailability', {
    where: [
      { field: 'date', op: '>=', value: monthRange.start },
      { field: 'date', op: '<=', value: monthRange.end },
    ],
    limitCount: 60,
    orderByField: 'date',
    orderDirection: 'asc',
  })

  const appointments = useCollection('groomingAppointments', {
    where: [
      { field: 'date', op: '>=', value: monthRange.start },
      { field: 'date', op: '<=', value: monthRange.end },
    ],
    limitCount: 500,
    orderByField: 'date',
    orderDirection: 'asc',
  })

  const reminderWindowEnd = useMemo(() => addDays(todayISO(), 14), [])
  const upcomingAppointments = useCollection('groomingAppointments', {
    where: [
      { field: 'date', op: '>=', value: todayISO() },
      { field: 'date', op: '<=', value: reminderWindowEnd },
    ],
    limitCount: 150,
    orderByField: 'date',
    orderDirection: 'asc',
  })

  const groomingSettings = useCollection('groomingSettings', { limitCount: 5 })
  const storedSettings = groomingSettings.items.find((item) => item.id === 'config') || null
  const storedReminderLeadDays = Number(storedSettings?.reminderLeadDays ?? DEFAULT_REMINDER_LEAD_DAYS)
  const reminderLeadDays = Number.isFinite(storedReminderLeadDays)
    ? Math.max(0, storedReminderLeadDays)
    : DEFAULT_REMINDER_LEAD_DAYS

  useEffect(() => {
    setTemplate(storedSettings?.reminderTemplate || '')
  }, [storedSettings?.reminderTemplate])

  const availableDateSet = useMemo(
    () => new Set(availability.items.filter((item) => item.active !== false).map((item) => item.date || item.id)),
    [availability.items],
  )

  const appointmentsByDate = useMemo(() => appointments.items.reduce((acc, item) => {
    if (!item.date) return acc
    if (!acc[item.date]) acc[item.date] = []
    acc[item.date].push(item)
    return acc
  }, {}), [appointments.items])

  const selectedDayAppointments = useMemo(
    () => [...(appointmentsByDate[selectedDate] || [])].sort((a, b) => String(a.time || '').localeCompare(String(b.time || ''))),
    [appointmentsByDate, selectedDate],
  )

  const dataControls = useDataControls(selectedDayAppointments, {
    searchFields: ['tutorName', 'petName', 'breed', 'phone', 'status', 'searchText'],
    defaultPageSize: 25,
  })

  const dueReminders = useMemo(() => {
    const today = todayISO()
    return [...upcomingAppointments.items]
      .filter((item) => {
        if (['Cancelado', 'No asistió'].includes(item.status)) return false
        if (item.reminderStatus === 'Enviado') return false
        const reminderDate = item.reminderDate || addDays(item.date, -reminderLeadDays)
        return reminderDate <= today
      })
      .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`))
  }, [reminderLeadDays, upcomingAppointments.items])

  const selectedDateAvailable = availableDateSet.has(selectedDate)
  const selectedSummary = useMemo(() => ({
    total: selectedDayAppointments.length,
    pending: selectedDayAppointments.filter((item) => item.status === 'Pendiente').length,
    confirmed: selectedDayAppointments.filter((item) => item.status === 'Confirmado').length,
    done: selectedDayAppointments.filter((item) => item.status === 'Realizado').length,
  }), [selectedDayAppointments])

  const columns = [
    { key: 'time', label: 'Hora' },
    { key: 'tutorName', label: 'Tutor' },
    { key: 'petName', label: 'Mascota' },
    { key: 'breed', label: 'Raza' },
    { key: 'weightKg', label: 'Peso', render: (row) => weightLabel(row.weightKg) },
    { key: 'phone', label: 'Teléfono' },
    {
      key: 'status',
      label: 'Estado',
      render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status || 'Pendiente'}</StatusBadge>,
    },
    {
      key: 'reminderStatus',
      label: 'Recordatorio',
      render: (row) => (
        <StatusBadge tone={row.reminderStatus === 'Enviado' ? 'success' : 'warning'}>
          {row.reminderStatus || 'Pendiente'}
        </StatusBadge>
      ),
    },
  ]

  function selectDate(iso) {
    setSelectedDate(iso)
    const date = toDateAtNoon(iso)
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0))
  }

  function moveMonth(offset) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0))
  }

  function changeTab(tab) {
    const nextParams = new URLSearchParams(searchParams)
    if (tab === 'recordatorios') nextParams.set('tab', 'recordatorios')
    else nextParams.delete('tab')
    setSearchParams(nextParams, { replace: true })
  }

  function insertTemplateVariable(token) {
    setTemplate((current) => {
      const separator = current && !/\s$/.test(current) ? ' ' : ''
      return `${current}${separator}${token}`
    })
  }

  async function toggleAvailability(date = selectedDate) {
    if (!canWrite) return
    const isAvailable = availableDateSet.has(date)
    const dayAppointments = appointmentsByDate[date] || []

    if (isAvailable && dayAppointments.length > 0) {
      feedback.warning('No se puede quitar este día porque ya tiene turnos cargados.')
      return
    }

    try {
      if (isAvailable) {
        await availability.remove(date)
        feedback.success('El día dejó de estar disponible para peluquería.')
      } else {
        await availability.set(date, {
          date,
          active: true,
          source: 'manual',
        })
        feedback.success('Día habilitado para recibir turnos de peluquería.')
      }
    } catch (error) {
      feedback.error(error?.message || 'No se pudo actualizar la disponibilidad.')
    }
  }

  function openCreate(date = selectedDate) {
    if (!canWrite) return
    if (!availableDateSet.has(date)) {
      feedback.warning('Primero marcá este día como disponible para peluquería.')
      return
    }
    setEditing(null)
    setForm({ ...initialForm, date })
    setModalOpen(true)
  }

  function openEdit(row) {
    if (!canWrite) return
    setEditing(row)
    setForm({
      ...initialForm,
      date: row.date || selectedDate,
      time: row.time || '09:00',
      tutorName: row.tutorName || '',
      petName: row.petName || '',
      breed: row.breed || '',
      weightKg: row.weightKg ?? '',
      phone: row.phone || '',
    })
    setModalOpen(true)
  }

  function handleChange(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveAppointment(event) {
    event.preventDefault()
    if (!canWrite) return

    const normalized = {
      date: form.date,
      time: form.time,
      tutorName: String(form.tutorName || '').trim(),
      petName: String(form.petName || '').trim(),
      species: 'Perro',
      breed: String(form.breed || '').trim(),
      weightKg: Number(String(form.weightKg || '').replace(',', '.')),
      phone: String(form.phone || '').trim(),
    }

    if (!availableDateSet.has(normalized.date)) {
      feedback.warning('La fecha elegida no está marcada como disponible para peluquería.')
      return
    }
    if (!normalized.tutorName || !normalized.petName || !normalized.breed || !normalized.phone) {
      feedback.warning('Completá tutor, mascota, raza y teléfono.')
      return
    }
    if (!Number.isFinite(normalized.weightKg) || normalized.weightKg <= 0) {
      feedback.warning('Ingresá un peso válido mayor a 0 kg.')
      return
    }

    setSaving(true)
    try {
      const status = editing?.status || 'Pendiente'
      const reminderStatus = editing?.reminderStatus || 'Pendiente'
      const reminderDate = addDays(normalized.date, -reminderLeadDays)
      const payload = {
        ...normalized,
        status,
        reminderDate,
        reminderStatus,
        reminderSentAtISO: editing?.reminderSentAtISO || '',
      }
      const indexedPayload = {
        ...payload,
        ...buildSearchPayload(payload, ['date', 'time', 'tutorName', 'petName', 'breed', 'phone', 'status']),
      }

      if (editing) await appointments.update(editing.id, indexedPayload)
      else await appointments.create(indexedPayload)

      feedback.success(editing ? 'El turno de peluquería se actualizó.' : 'El turno de peluquería se creó correctamente.')
      selectDate(indexedPayload.date)
      setModalOpen(false)
      appointments.refresh()
      upcomingAppointments.refresh()
      notifyGroomingAppointmentsChanged()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el turno de peluquería.')
    } finally {
      setSaving(false)
    }
  }

  async function updateStatus(row, status) {
    if (!canWrite || !row?.id) return
    try {
      await appointments.update(row.id, { status })
      feedback.success('Estado del turno actualizado.')
      appointments.refresh()
      upcomingAppointments.refresh()
      notifyGroomingAppointmentsChanged()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo actualizar el estado.')
    }
  }

  async function markReminderSent(row) {
    if (!canWrite || !row?.id) return
    try {
      await appointments.update(row.id, {
        reminderStatus: 'Enviado',
        reminderSentAtISO: new Date().toISOString(),
      })
      feedback.success(`Recordatorio de ${row.petName || 'la mascota'} marcado como enviado.`)
      appointments.refresh()
      upcomingAppointments.refresh()
      notifyGroomingAppointmentsChanged()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo marcar el recordatorio como enviado.')
    }
  }

  function openWhatsApp(row) {
    if (!String(template || '').trim()) {
      feedback.warning('Primero cargá el texto predeterminado del recordatorio.')
      return
    }
    const url = buildWhatsAppUrl(row, template)
    if (!url) {
      feedback.warning('Revisá el teléfono del turno y el texto del recordatorio.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function deleteAppointment(row) {
    if (!canWrite) return
    const ok = await feedback.confirm({
      title: 'Eliminar turno de peluquería',
      message: `¿Eliminar el turno de ${row.petName || 'esta mascota'} del ${dateLabel(row.date)} a las ${row.time || '-'}?`,
      confirmText: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return

    try {
      await appointments.remove(row.id)
      feedback.success('El turno fue eliminado.')
      appointments.refresh()
      upcomingAppointments.refresh()
      notifyGroomingAppointmentsChanged()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo eliminar el turno.')
    }
  }

  async function saveReminderTemplate() {
    if (!canWrite) return
    setSavingTemplate(true)
    try {
      await groomingSettings.set('config', {
        reminderTemplate: String(template || '').trim(),
        reminderLeadDays: DEFAULT_REMINDER_LEAD_DAYS,
      })
      feedback.success('Texto predeterminado guardado.')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el texto del recordatorio.')
    } finally {
      setSavingTemplate(false)
    }
  }

  if (!canRead) {
    return (
      <section className="access-denied-panel">
        <div className="system-card system-card-danger">
          <div className="system-icon">!</div>
          <p className="eyebrow">Acceso restringido</p>
          <h1>No tenés permiso para ver Peluquería</h1>
          <p>Esta sección utiliza los permisos de Agenda.</p>
        </div>
      </section>
    )
  }

  const calendarLoading = availability.loading || appointments.loading
  const reminderLoading = upcomingAppointments.loading || groomingSettings.loading
  const error = availability.error || appointments.error || upcomingAppointments.error || groomingSettings.error

  return (
    <section className="grooming-page">
      <SectionHeader
        eyebrow="Servicios"
        title="Peluquería"
        description="Organizá los días disponibles, cargá los turnos y enviá los recordatorios pendientes por WhatsApp."
        actions={canWrite && activeTab === 'agenda' ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openCreate(selectedDate)}
            disabled={!selectedDateAvailable}
            title={selectedDateAvailable ? '' : 'Primero habilitá el día seleccionado'}
          >
            Nuevo turno
          </button>
        ) : null}
      />

      <nav className="grooming-tabs" aria-label="Secciones de peluquería">
        <button
          type="button"
          className={activeTab === 'agenda' ? 'is-active' : ''}
          onClick={() => changeTab('agenda')}
        >
          Agenda
        </button>
        <button
          type="button"
          className={activeTab === 'recordatorios' ? 'is-active' : ''}
          onClick={() => changeTab('recordatorios')}
        >
          Recordatorios
          {dueReminders.length > 0 && <strong>{dueReminders.length > 99 ? '99+' : dueReminders.length}</strong>}
        </button>
      </nav>

      {error && <div className="alert alert-danger">{error}</div>}

      {activeTab === 'recordatorios' ? (
        <div className="grooming-reminders-layout">
          <section className="grooming-reminders-workspace">
            <div className="panel grooming-reminder-overview">
              <div>
                <span className="eyebrow">Avisos por WhatsApp</span>
                <h2>Recordatorios pendientes</h2>
                <p>
                  El sistema muestra acá los turnos cuyo recordatorio ya corresponde enviar. Al presionar
                  “Enviar por WhatsApp” abre directamente el número guardado y carga el mensaje completo.
                </p>
              </div>
              <strong className="grooming-alert-count">{dueReminders.length}</strong>
            </div>

            {reminderLoading ? (
              <div className="panel">Cargando recordatorios de peluquería...</div>
            ) : dueReminders.length === 0 ? (
              <div className="panel grooming-reminder-empty">
                <strong>No hay recordatorios pendientes.</strong>
                <p>Cuando llegue el día de enviar un aviso, aparecerá automáticamente en esta sección y en la campana general.</p>
              </div>
            ) : (
              <div className="grooming-reminder-list grooming-reminder-list-detailed">
                {dueReminders.map((row) => {
                  const preparedMessage = applyReminderTemplate(template, row)
                  return (
                    <article className="grooming-reminder-card grooming-reminder-card-detailed" key={row.id}>
                      <div className="grooming-reminder-content">
                        <div className="grooming-reminder-title-row">
                          <div>
                            <strong>{row.petName || 'Mascota'} · {row.tutorName || 'Tutor'}</strong>
                            <span>{dateLabel(row.date)} a las {row.time || '--:--'} · {row.phone || 'Sin teléfono'}</span>
                          </div>
                          <StatusBadge tone="warning">Pendiente</StatusBadge>
                        </div>
                        <div className="grooming-reminder-message">
                          <span>Mensaje preparado</span>
                          <p>{preparedMessage || 'Todavía no se configuró el texto predeterminado.'}</p>
                        </div>
                      </div>
                      <div className="grooming-reminder-actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => openWhatsApp(row)}
                          disabled={!template.trim() || !row.phone}
                        >
                          Enviar por WhatsApp
                        </button>
                        {canWrite && (
                          <button type="button" className="btn" onClick={() => markReminderSent(row)}>
                            Marcar como enviado
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          <aside className="panel grooming-template-panel grooming-template-standalone">
            <div className="grooming-template-head">
              <div>
                <span className="eyebrow">Mensaje automático</span>
                <h2>Texto predeterminado</h2>
              </div>
              <StatusBadge tone={template.trim() ? 'success' : 'warning'}>
                {template.trim() ? 'Configurado' : 'Pendiente'}
              </StatusBadge>
            </div>

            <div className="grooming-template-help">
              <strong>No tenés que escribir el nombre real de cada cliente.</strong>
              <p>
                Escribí el texto una sola vez. Al enviar, <code>{'{tutor}'}</code> se reemplaza por el nombre cargado
                en ese turno y <code>{'{mascota}'}</code> por la mascota correspondiente.
              </p>
            </div>

            <textarea
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              rows={8}
              placeholder="Pegá acá el texto del cliente. Por ejemplo: Hola {tutor}, te recordamos el turno de {mascota} para el {fecha} a las {hora}."
              disabled={!canWrite}
            />

            {canWrite && (
              <div className="grooming-template-variables" aria-label="Datos automáticos disponibles">
                {TEMPLATE_VARIABLES.map((item) => (
                  <button key={item.token} type="button" onClick={() => insertTemplateVariable(item.token)}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}

            <small>
              Los botones agregan el dato automático al texto, para que no tengas que escribir llaves ni recordar cómo se llama cada variable.
            </small>

            {dueReminders[0] && template.trim() && (
              <div className="grooming-template-preview">
                <span>Vista previa con el primer recordatorio pendiente</span>
                <p>{applyReminderTemplate(template, dueReminders[0])}</p>
              </div>
            )}

            {canWrite && (
              <button type="button" className="btn btn-primary full" onClick={saveReminderTemplate} disabled={savingTemplate}>
                {savingTemplate ? 'Guardando...' : 'Guardar texto predeterminado'}
              </button>
            )}
          </aside>
        </div>
      ) : (
        <>
          <div className="grooming-layout">
            <article className="panel agenda-calendar-panel grooming-calendar-panel">
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

              <div className="calendar-month" role="grid" aria-label="Calendario de peluquería">
                {calendarDays.map((day) => {
                  const dayAppointments = appointmentsByDate[day.iso] || []
                  const isSelected = day.iso === selectedDate
                  const isToday = day.iso === todayISO()
                  const isAvailable = availableDateSet.has(day.iso)
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      className={`calendar-day grooming-calendar-day ${day.currentMonth ? '' : 'muted-day'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isAvailable ? 'is-available' : ''}`}
                      onClick={() => selectDate(day.iso)}
                    >
                      <span className="calendar-day-number">{day.dayNumber}</span>
                      {isAvailable && <span className="grooming-availability-chip">Viene</span>}
                      {dayAppointments.length > 0 && <strong>{dayAppointments.length} turno{dayAppointments.length === 1 ? '' : 's'}</strong>}
                      {dayAppointments.slice(0, 2).map((item) => (
                        <em key={item.id}>{item.time || '--:--'} {item.petName || 'Mascota'}</em>
                      ))}
                    </button>
                  )
                })}
              </div>

              <div className="calendar-footer-actions">
                <button className="btn btn-small" type="button" onClick={() => selectDate(todayISO())}>Hoy</button>
                {canWrite && (
                  <button
                    className={`btn btn-small ${selectedDateAvailable ? 'btn-danger' : 'btn-primary'}`}
                    type="button"
                    onClick={() => toggleAvailability(selectedDate)}
                  >
                    {selectedDateAvailable ? 'Quitar día disponible' : 'Marcar día disponible'}
                  </button>
                )}
                {canWrite && (
                  <button className="btn btn-small btn-primary" type="button" onClick={() => openCreate(selectedDate)} disabled={!selectedDateAvailable}>
                    Agregar turno
                  </button>
                )}
              </div>
            </article>

            <aside className="grooming-side-column">
              <div className={`panel grooming-day-status ${selectedDateAvailable ? 'is-open' : 'is-closed'}`}>
                <span className="eyebrow">{dateLabel(selectedDate)}</span>
                <h2>{selectedDateAvailable ? 'Día disponible' : 'Día no habilitado'}</h2>
                <p>
                  {selectedDateAvailable
                    ? 'La profesional viene este día y se pueden cargar turnos.'
                    : 'Marcá el día como disponible antes de agregar turnos.'}
                </p>
              </div>

              <div className="stats-grid compact grooming-stats">
                <div className="stat-card"><span>Total</span><strong>{selectedSummary.total}</strong></div>
                <div className="stat-card tone-info"><span>Confirmados</span><strong>{selectedSummary.confirmed}</strong></div>
                <div className="stat-card tone-warning"><span>Pendientes</span><strong>{selectedSummary.pending}</strong></div>
                <div className="stat-card tone-success"><span>Realizados</span><strong>{selectedSummary.done}</strong></div>
              </div>

              <button
                type="button"
                className="panel grooming-reminder-shortcut"
                onClick={() => changeTab('recordatorios')}
              >
                <span className="eyebrow">WhatsApp</span>
                <strong>Recordatorios pendientes</strong>
                <p>{dueReminders.length > 0 ? `${dueReminders.length} aviso${dueReminders.length === 1 ? '' : 's'} para enviar` : 'No hay avisos pendientes'}</p>
              </button>
            </aside>
          </div>

          <div className="panel grooming-list-toolbar">
            <div>
              <span className="eyebrow">Turnos del día</span>
              <h2>{dateLabel(selectedDate)}</h2>
            </div>
            <input
              className="search-input"
              value={dataControls.query}
              onChange={(event) => dataControls.setQuery(event.target.value)}
              placeholder="Buscar tutor, mascota, raza o teléfono..."
            />
          </div>

          {calendarLoading ? (
            <div className="panel">Cargando agenda de peluquería...</div>
          ) : (
            <>
              <DataTable
                rows={dataControls.rows}
                columns={columns}
                empty={selectedDateAvailable ? `No hay turnos para el ${dateLabel(selectedDate)}.` : 'Este día no está habilitado para peluquería.'}
                mobile={{
                  title: 'petName',
                  subtitle: 'tutorName',
                  meta: ['time', 'breed', 'weightKg', 'status'],
                  details: ['time', 'tutorName', 'petName', 'breed', 'weightKg', 'phone', 'status', 'reminderStatus'],
                  ariaLabel: 'Turnos de peluquería',
                }}
                actions={(row) => (
                  <>
                    {canWrite && (
                      <select
                        className="grooming-status-select"
                        value={row.status || 'Pendiente'}
                        onChange={(event) => updateStatus(row, event.target.value)}
                        aria-label={`Estado de ${row.petName || 'turno'}`}
                      >
                        {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    )}
                    {canWrite && <button type="button" className="btn btn-small" onClick={() => openEdit(row)}>Editar</button>}
                    {canWrite && <button type="button" className="btn btn-small btn-danger" onClick={() => deleteAppointment(row)}>Eliminar</button>}
                  </>
                )}
              />
              <Pagination
                page={dataControls.page}
                pageCount={dataControls.pageCount}
                pageSize={dataControls.pageSize}
                onPageChange={dataControls.setPage}
                onPageSizeChange={dataControls.setPageSize}
                total={dataControls.total}
                rawTotal={dataControls.rawTotal}
              />
            </>
          )}
        </>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Editar turno de peluquería' : 'Nuevo turno de peluquería'}
          onClose={() => setModalOpen(false)}
          footer={(
            <>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={formId} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar turno'}
              </button>
            </>
          )}
        >
          <form id={formId} onSubmit={saveAppointment}>
            <FormGrid
              value={form}
              onChange={handleChange}
              fields={[
                { name: 'date', label: 'Fecha', type: 'date', required: true, readOnly: true, hint: 'La fecha se toma del día seleccionado en el calendario.' },
                { name: 'time', label: 'Hora', type: 'time', required: true },
                { name: 'tutorName', label: 'Nombre del tutor', required: true, autoComplete: 'name' },
                { name: 'petName', label: 'Nombre de la mascota', required: true },
                { name: 'breed', label: 'Raza', required: true },
                { name: 'weightKg', label: 'Kilos del perro', type: 'number', min: '0.1', step: '0.1', inputMode: 'decimal', required: true },
                { name: 'phone', label: 'Número de teléfono', type: 'tel', inputMode: 'tel', autoComplete: 'tel', required: true, hint: 'Podés ingresarlo con código de área, espacios o guiones.' },
              ]}
            />
            <div className="grooming-form-note">
              <strong>Especie:</strong> Perro. Se guarda automáticamente y no requiere carga manual.
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
