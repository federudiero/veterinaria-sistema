import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../../hooks/useCollection.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { dateLabel, todayISO } from '../../utils/formatters.js'

function notificationDate(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return dateLabel(value)
  try {
    return new Date(value).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return String(value)
  }
}

function shortMessage(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > 120 ? `${text.slice(0, 117)}...` : text
}

function toDateAtNoon(isoDate) {
  const [year, month, day] = String(isoDate || todayISO()).split('-').map(Number)
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1, 12, 0, 0)
}

function addDays(isoDate, amount) {
  const date = toDateAtNoon(isoDate)
  date.setDate(date.getDate() + amount)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function NotificationsData({ children }) {
  const notifications = useCollection('notifications', {
    limitCount: 50,
    orderByField: 'createdAtISO',
    orderDirection: 'desc',
  })
  return children(notifications)
}

function GroomingRemindersData({ children }) {
  const groomingAppointments = useCollection('groomingAppointments', {
    where: [
      { field: 'date', op: '>=', value: todayISO() },
      { field: 'date', op: '<=', value: addDays(todayISO(), 14) },
    ],
    limitCount: 150,
    orderByField: 'date',
    orderDirection: 'asc',
  })

  useEffect(() => {
    const refresh = () => groomingAppointments.refresh()
    window.addEventListener('grooming-appointments-changed', refresh)
    return () => window.removeEventListener('grooming-appointments-changed', refresh)
  }, [groomingAppointments.refresh])

  return children(groomingAppointments)
}

function NotificationBellContent({ notifications, groomingAppointments, canWriteNotifications, canReadNotifications, canReadGrooming }) {
  const [open, setOpen] = useState(false)

  const notificationRows = notifications?.items || []
  const unreadRows = useMemo(
    () => notificationRows.filter((item) => item.status !== 'Leída' && item.status !== 'Archivada'),
    [notificationRows],
  )

  const groomingRows = groomingAppointments?.items || []
  const dueGroomingRows = useMemo(() => {
    const today = todayISO()
    return groomingRows
      .filter((item) => {
        if (['Cancelado', 'No asistió'].includes(item.status)) return false
        if (item.reminderStatus === 'Enviado') return false
        const reminderDate = item.reminderDate || addDays(item.date, -1)
        return reminderDate <= today
      })
      .map((item) => ({
        ...item,
        id: `grooming-${item.id}`,
        sourceId: item.id,
        _kind: 'grooming',
        title: `Recordatorio de peluquería: ${item.petName || 'Mascota'}`,
        message: `${item.tutorName || 'Tutor'} · turno ${dateLabel(item.date)} a las ${item.time || '--:--'}`,
        clientName: item.tutorName || '',
        patientName: item.petName || '',
        priority: 'Enviar WhatsApp',
      }))
      .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`))
  }, [groomingRows])

  const latestRows = useMemo(
    () => [...dueGroomingRows, ...unreadRows].slice(0, 6),
    [dueGroomingRows, unreadRows],
  )
  const pendingCount = dueGroomingRows.length + unreadRows.length

  async function markAsRead(row) {
    if (!canWriteNotifications || !row?.id || row._kind === 'grooming') return
    await notifications.update(row.id, { status: 'Leída', readAtISO: new Date().toISOString() })
  }

  return (
    <div className="notification-bell-wrap">
      <button
        type="button"
        className={`notification-bell ${pendingCount ? 'has-unread' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir notificaciones"
      >
        <span>🔔</span>
        {pendingCount > 0 && <strong>{pendingCount > 99 ? '99+' : pendingCount}</strong>}
      </button>

      {open && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <strong>Notificaciones</strong>
            <div className="notification-popover-links">
              {canReadGrooming && <Link to="/peluqueria?tab=recordatorios" onClick={() => setOpen(false)}>Peluquería</Link>}
              {canReadNotifications && <Link to="/sistema?tab=notificaciones" onClick={() => setOpen(false)}>Ver todas</Link>}
            </div>
          </div>

          {latestRows.length === 0 ? (
            <div className="notification-empty">No hay notificaciones pendientes.</div>
          ) : latestRows.map((row) => (
            <article key={row.id} className={`notification-popover-item ${row._kind === 'grooming' ? 'is-grooming-reminder' : ''}`}>
              <div>
                <strong>{row.title || row.type || 'Notificación'}</strong>
                <span>{notificationDate(row.createdAtISO || row.date)}</span>
              </div>
              <p>{shortMessage(row.message)}</p>
              <small>{[row.patientName, row.clientName, row.priority].filter(Boolean).join(' · ')}</small>
              {row._kind === 'grooming' ? (
                <Link className="btn btn-small btn-primary" to="/peluqueria?tab=recordatorios" onClick={() => setOpen(false)}>
                  Revisar recordatorio
                </Link>
              ) : canWriteNotifications ? (
                <button type="button" className="btn btn-small btn-ghost" onClick={() => markAsRead(row)}>
                  Marcar leída
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function NotificationBell() {
  const { hasPermission } = useAuth()
  const canReadNotifications = hasPermission('notificaciones.read')
  const canWriteNotifications = hasPermission('notificaciones.write')
  const canReadGrooming = hasPermission('agenda.read')

  if (!canReadNotifications && !canReadGrooming) return null

  if (canReadNotifications && canReadGrooming) {
    return (
      <NotificationsData>
        {(notifications) => (
          <GroomingRemindersData>
            {(groomingAppointments) => (
              <NotificationBellContent
                notifications={notifications}
                groomingAppointments={groomingAppointments}
                canWriteNotifications={canWriteNotifications}
                canReadNotifications={canReadNotifications}
                canReadGrooming={canReadGrooming}
              />
            )}
          </GroomingRemindersData>
        )}
      </NotificationsData>
    )
  }

  if (canReadNotifications) {
    return (
      <NotificationsData>
        {(notifications) => (
          <NotificationBellContent
            notifications={notifications}
            groomingAppointments={null}
            canWriteNotifications={canWriteNotifications}
            canReadNotifications={canReadNotifications}
            canReadGrooming={false}
          />
        )}
      </NotificationsData>
    )
  }

  return (
    <GroomingRemindersData>
      {(groomingAppointments) => (
        <NotificationBellContent
          notifications={null}
          groomingAppointments={groomingAppointments}
          canWriteNotifications={false}
          canReadNotifications={false}
          canReadGrooming={canReadGrooming}
        />
      )}
    </GroomingRemindersData>
  )
}
