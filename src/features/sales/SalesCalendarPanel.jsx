import React from 'react'
import { dateLabel, money, numberValue, todayISO } from '../../utils/formatters.js'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export function toDateAtNoon(isoDate) {
  const [year, month, day] = String(isoDate || todayISO()).split('-').map(Number)
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1, 12, 0, 0)
}

export function formatISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function monthLabel(date) {
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(date)
}

export function buildCalendarDays(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0)
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

export function SalesCalendarPanel({
  calendarDays,
  monthDate,
  selectedDate,
  salesByDate,
  monthLoading,
  onMoveMonth,
  onSelectDate,
  onCreateSale,
  canWrite,
}) {
  return (
    <article className="panel agenda-calendar-panel sales-calendar-panel">
      <div className="calendar-toolbar">
        <button className="btn btn-small" type="button" onClick={() => onMoveMonth(-1)}>Anterior</button>
        <div>
          <strong>{monthLabel(monthDate)}</strong>
          <span>Ventas de {dateLabel(selectedDate)}</span>
        </div>
        <button className="btn btn-small" type="button" onClick={() => onMoveMonth(1)}>Siguiente</button>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
      </div>

      <div className="calendar-month" role="grid" aria-label="Calendario mensual de ventas">
        {calendarDays.map((day) => {
          const summary = salesByDate[day.iso] || { count: 0, paidTotal: 0, pendingTotal: 0, voidedCount: 0 }
          const hasSales = summary.count > 0 || summary.voidedCount > 0
          const isSelected = day.iso === selectedDate
          const isToday = day.iso === todayISO()
          return (
            <button
              key={day.iso}
              type="button"
              className={`calendar-day sales-calendar-day ${day.currentMonth ? '' : 'muted-day'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onSelectDate(day.iso)}
            >
              <span className="calendar-day-number">{day.dayNumber}</span>
              {hasSales ? (
                <>
                  <strong>{summary.count} venta{summary.count === 1 ? '' : 's'}</strong>
                  <em>Cobrado {money(summary.paidTotal)}</em>
                  {summary.pendingTotal > 0 && <em>Pend. {money(summary.pendingTotal)}</em>}
                  {summary.voidedCount > 0 && <em>{summary.voidedCount} anulada{summary.voidedCount === 1 ? '' : 's'}</em>}
                </>
              ) : (
                <em>Sin ventas</em>
              )}
            </button>
          )
        })}
      </div>

      <div className="calendar-footer-actions">
        <button className="btn btn-small" type="button" onClick={() => onSelectDate(todayISO())}>Hoy</button>
        {canWrite && <button className="btn btn-small btn-primary" type="button" onClick={() => onCreateSale(selectedDate)}>Nueva venta en este día</button>}
        {monthLoading && <span className="muted">Actualizando resumen mensual...</span>}
      </div>
    </article>
  )
}

export function summarizeSalesByDate(rows) {
  return (rows || []).reduce((acc, row) => {
    const date = row.date || todayISO()
    if (!acc[date]) {
      acc[date] = { count: 0, paidTotal: 0, pendingTotal: 0, voidedCount: 0 }
    }

    if (row.status === 'Anulada') {
      acc[date].voidedCount += 1
      return acc
    }

    acc[date].count += 1
    if (row.paid) acc[date].paidTotal += numberValue(row.total)
    else acc[date].pendingTotal += numberValue(row.total)
    return acc
  }, {})
}
