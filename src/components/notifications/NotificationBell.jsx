import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCollection } from '../../hooks/useCollection.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { dateLabel } from '../../utils/formatters.js'

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

function NotificationBellContent({ canWrite }) {
  const [open, setOpen] = useState(false)
  const notifications = useCollection('notifications', {
    limitCount: 50,
    orderByField: 'createdAtISO',
    orderDirection: 'desc',
  })

  const rows = notifications.items || []
  const unreadRows = useMemo(
    () => rows.filter((item) => item.status !== 'Leída' && item.status !== 'Archivada'),
    [rows],
  )
  const latestRows = unreadRows.slice(0, 6)

  async function markAsRead(row) {
    if (!canWrite || !row?.id) return
    await notifications.update(row.id, { status: 'Leída', readAtISO: new Date().toISOString() })
  }

  return (
    <div className="notification-bell-wrap">
      <button
        type="button"
        className={`notification-bell ${unreadRows.length ? 'has-unread' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Abrir notificaciones"
      >
        <span>🔔</span>
        {unreadRows.length > 0 && <strong>{unreadRows.length > 99 ? '99+' : unreadRows.length}</strong>}
      </button>

      {open && (
        <div className="notification-popover">
          <div className="notification-popover-head">
            <strong>Notificaciones</strong>
            <Link to="/sistema?tab=notificaciones" onClick={() => setOpen(false)}>Ver todas</Link>
          </div>

          {latestRows.length === 0 ? (
            <div className="notification-empty">No hay notificaciones pendientes.</div>
          ) : latestRows.map((row) => (
            <article key={row.id} className="notification-popover-item">
              <div>
                <strong>{row.title || row.type || 'Notificación'}</strong>
                <span>{notificationDate(row.createdAtISO || row.date)}</span>
              </div>
              <p>{shortMessage(row.message)}</p>
              <small>{[row.patientName, row.clientName, row.priority].filter(Boolean).join(' · ')}</small>
              {canWrite && (
                <button type="button" className="btn btn-small btn-ghost" onClick={() => markAsRead(row)}>
                  Marcar leída
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export function NotificationBell() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission('notificaciones.read')
  const canWrite = hasPermission('notificaciones.write')
  if (!canRead) return null
  return <NotificationBellContent canWrite={canWrite} />
}
