import React, { useId, useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { IndividualExportActions } from '../../components/export/IndividualExportActions.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useLookups } from '../../hooks/useLookups.js'
import { useDataControls } from '../../hooks/useDataControls.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { buildSearchPayload, normalizeSearchText } from '../../utils/search.js'
import { dateLabel, money, numberValue, todayISO } from '../../utils/formatters.js'
import {
  DEFAULT_CREDIT_SURCHARGE_PERCENT,
  calculateSalePricing,
  isCreditPaymentMethod,
  paymentLabelWithSurcharge,
} from '../../utils/salesPricing.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { filterOpenShiftsForUser, shiftOptionLabel, shiftUserPayload } from '../../utils/shifts.js'

const KIND_OPTIONS = ['Recordatorio', 'Venta futura']
const STATUS_OPTIONS = ['Pendiente', 'Hecho', 'Enviado', 'Respondido', 'Cancelado', 'Venta pendiente', 'Venta cargada']
const CHANNEL_OPTIONS = ['WhatsApp', 'Email', 'Llamada', 'Interno', 'Mostrador']
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Debito', 'Credito', 'Cuenta corriente']
const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const CATEGORY_OPTIONS = [
  'General',
  'Venta futura',
  'Alimentos',
  'Vacuna',
  'Control',
  'Cuenta corriente',
  'Proveedor',
  'Urgente',
  'Interno',
]

const COLOR_OPTIONS = [
  { value: 'Turquesa', label: 'Turquesa', className: 'reminder-color-teal' },
  { value: 'Azul', label: 'Azul', className: 'reminder-color-blue' },
  { value: 'Verde', label: 'Verde', className: 'reminder-color-green' },
  { value: 'Naranja', label: 'Naranja', className: 'reminder-color-orange' },
  { value: 'Rojo', label: 'Rojo', className: 'reminder-color-red' },
  { value: 'Violeta', label: 'Violeta', className: 'reminder-color-purple' },
  { value: 'Gris', label: 'Gris', className: 'reminder-color-slate' },
]

const initialForm = {
  date: todayISO(),
  time: '09:00',
  kind: 'Recordatorio',
  title: '',
  category: 'General',
  type: 'General',
  color: 'Turquesa',
  clientId: '',
  patientId: '',
  channel: 'WhatsApp',
  message: '',
  status: 'Pendiente',
  productId: '',
  productName: '',
  qty: 1,
  unitPrice: 0,
  paymentMethod: 'Efectivo',
  creditSurchargePercent: DEFAULT_CREDIT_SURCHARGE_PERCENT,
  affectStock: false,
  notes: '',
  saleGenerated: false,
  relatedSaleId: '',
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

function colorClass(color) {
  return COLOR_OPTIONS.find((item) => item.value === color)?.className || 'reminder-color-teal'
}

function statusTone(status) {
  if (status === 'Hecho' || status === 'Respondido' || status === 'Venta cargada') return 'success'
  if (status === 'Cancelado') return 'danger'
  if (status === 'Venta pendiente') return 'warning'
  if (status === 'Enviado') return 'info'
  return 'default'
}

function rowSearch(row, maps) {
  return normalizeSearchText([
    row.time,
    row.kind,
    row.title,
    row.category || row.type,
    row.channel,
    row.status,
    row.message,
    row.notes,
    row.productName,
    maps.clientMap[row.clientId],
    maps.patientMap[row.patientId],
  ].filter(Boolean).join(' '))
}

function normalizeKind(value) {
  return value === 'Venta futura' ? 'Venta futura' : 'Recordatorio'
}

export function RemindersPage() {
  const reminders = useCollection('reminders', { limitCount: 500, orderByField: 'date', orderDirection: 'desc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const {
    clientOptions,
    patientOptions,
    productOptions,
    clientMap,
    patientMap,
    productMap,
    clientById,
    patientById,
    productById,
  } = useLookups()
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [monthDate, setMonthDate] = useState(toDateAtNoon(todayISO()))
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const formId = useId()
  const feedback = useFeedback()
  const { hasPermission, user } = useAuth()
  const canRead = hasPermission('agenda.read')
  const canWrite = hasPermission('agenda.write')
  const canCreateSale = hasPermission('ventas.write')

  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const remindersByDate = useMemo(() => {
    return reminders.items.reduce((acc, item) => {
      const date = item.date || ''
      if (!date) return acc
      if (!acc[date]) acc[date] = []
      acc[date].push(item)
      return acc
    }, {})
  }, [reminders.items])

  const selectedProduct = useMemo(
    () => productById[form.productId] || null,
    [form.productId, productById],
  )

  const previewSubtotal = numberValue(form.qty) * numberValue(form.unitPrice || selectedProduct?.price)
  const previewPricing = calculateSalePricing({
    subtotal: previewSubtotal,
    paymentMethod: form.paymentMethod,
    creditSurchargePercent: form.creditSurchargePercent,
  })
  const forcedCreditSurcharge = isCreditPaymentMethod(form.paymentMethod)

  const selectedRows = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query)
    return (remindersByDate[selectedDate] || [])
      .filter((item) => !statusFilter || item.status === statusFilter)
      .filter((item) => !categoryFilter || (item.category || item.type) === categoryFilter)
      .filter((item) => !normalizedQuery || rowSearch(item, { clientMap, patientMap }).includes(normalizedQuery))
      .sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')))
  }, [remindersByDate, selectedDate, statusFilter, categoryFilter, query, clientMap, patientMap])

  const dailySummary = useMemo(() => {
    const allRows = remindersByDate[selectedDate] || []
    return {
      total: allRows.length,
      pending: allRows.filter((item) => item.status === 'Pendiente').length,
      futureSales: allRows.filter((item) => normalizeKind(item.kind) === 'Venta futura' && !item.saleGenerated).length,
      loadedSales: allRows.filter((item) => item.saleGenerated || item.status === 'Venta cargada').length,
    }
  }, [remindersByDate, selectedDate])

  const dailyPage = useDataControls(selectedRows)

  const columns = [
    { key: 'time', label: 'Hora', render: (row) => row.time || '-' },
    { key: 'kind', label: 'Tipo', render: (row) => normalizeKind(row.kind) },
    { key: 'title', label: 'Recordatorio', render: (row) => row.title || row.message || '-' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || row.clientName || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || row.patientName || '-' },
    {
      key: 'category',
      label: 'Categoría',
      render: (row) => (
        <span className={`reminder-chip ${colorClass(row.color)}`}>
          {row.category || row.type || 'General'}
        </span>
      ),
    },
    {
      key: 'productName',
      label: 'Venta futura',
      render: (row) => normalizeKind(row.kind) === 'Venta futura'
        ? `${row.productName || productMap[row.productId] || 'Producto'} x${row.qty || 1}${row.estimatedTotal ? ` · ${money(row.estimatedTotal)}` : ''}`
        : '-',
    },
    { key: 'status', label: 'Estado', render: (row) => <StatusBadge tone={statusTone(row.status)}>{row.status || 'Pendiente'}</StatusBadge> },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
      ...columns,
      { key: 'channel', label: 'Canal' },
      { key: 'message', label: 'Mensaje' },
      { key: 'paymentMethod', label: 'Método venta futura', exportValue: (row) => paymentLabelWithSurcharge(row.paymentMethod, row.creditSurchargePercent) },
      { key: 'relatedSaleId', label: 'Venta generada' },
      { key: 'notes', label: 'Notas' },
    ],
  })

  function selectDate(iso) {
    setSelectedDate(iso)
    const date = toDateAtNoon(iso)
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0))
  }

  function moveMonth(offset) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0))
  }

  function openCreate(date = selectedDate, kind = 'Recordatorio') {
    if (!canWrite) {
      feedback.warning('No tenés permiso para crear recordatorios.')
      return
    }
    const normalizedKind = normalizeKind(kind)
    setEditing(null)
    setForm({
      ...initialForm,
      date,
      kind: normalizedKind,
      category: normalizedKind === 'Venta futura' ? 'Venta futura' : 'General',
      type: normalizedKind === 'Venta futura' ? 'Venta futura' : 'General',
      title: normalizedKind === 'Venta futura' ? 'Venta futura para retirar' : '',
      message: normalizedKind === 'Venta futura' ? 'Cliente encargó producto para retirar este día.' : '',
    })
    setModalOpen(true)
  }

  function openEdit(row) {
    if (!canWrite) {
      feedback.warning('No tenés permiso para editar recordatorios.')
      return
    }
    setEditing(row)
    setForm({
      ...initialForm,
      ...row,
      kind: normalizeKind(row.kind),
      category: row.category || row.type || 'General',
      type: row.type || row.category || 'General',
      productName: row.productName || productMap[row.productId] || '',
      affectStock: Boolean(row.affectStock),
    })
    setModalOpen(true)
  }

  function handleChange(name, value) {
    setForm((current) => {
      const normalizedValue = name === 'creditSurchargePercent' || name === 'unitPrice'
        ? String(value).replace(',', '.')
        : value
      const next = {
        ...current,
        [name]: normalizedValue,
        ...(name === 'category' ? { type: value } : {}),
      }
      if (name === 'kind') {
        const normalizedKind = normalizeKind(value)
        next.kind = normalizedKind
        if (normalizedKind === 'Venta futura') {
          next.category = 'Venta futura'
          next.type = 'Venta futura'
          next.title = current.title || 'Venta futura para retirar'
          next.message = current.message || 'Cliente encargó producto para retirar este día.'
        }
      }
      if (name === 'productId') {
        const product = productById[value]
        next.productName = product?.name || current.productName || ''
        next.unitPrice = numberValue(current.unitPrice) > 0 ? current.unitPrice : numberValue(product?.price)
      }
      if (name === 'paymentMethod' && isCreditPaymentMethod(value)) {
        next.creditSurchargePercent = current.creditSurchargePercent || DEFAULT_CREDIT_SURCHARGE_PERCENT
      }
      return next
    })
  }

  async function saveReminder(event) {
    event.preventDefault()
    if (!canWrite) return
    const kind = normalizeKind(form.kind)
    if (kind === 'Venta futura' && !form.productId && !String(form.productName || '').trim()) {
      feedback.warning('Para una venta futura indicá un producto registrado o un producto manual.')
      return
    }
    setSaving(true)
    try {
      const product = productById[form.productId]
      const unitPrice = numberValue(form.unitPrice || product?.price)
      const qty = Math.max(1, numberValue(form.qty) || 1)
      const pricing = calculateSalePricing({
        subtotal: qty * unitPrice,
        paymentMethod: form.paymentMethod,
        creditSurchargePercent: form.creditSurchargePercent,
      })
      const payload = {
        ...form,
        kind,
        type: form.category || form.type || 'General',
        category: form.category || form.type || 'General',
        clientName: clientMap[form.clientId] || '',
        patientName: patientMap[form.patientId] || '',
        productName: form.productName || product?.name || '',
        qty,
        unitPrice,
        estimatedTotal: kind === 'Venta futura' ? pricing.total : 0,
        creditSurchargePercent: pricing.creditSurchargePercent,
        creditSurchargeAmount: kind === 'Venta futura' ? pricing.creditSurchargeAmount : 0,
        affectStock: Boolean(form.affectStock),
        stockAffected: false,
        saleGenerated: Boolean(form.saleGenerated),
        relatedSaleId: form.relatedSaleId || '',
      }
      const indexedPayload = {
        ...payload,
        ...buildSearchPayload(payload, [
          'date',
          'time',
          'kind',
          'title',
          'category',
          'type',
          'channel',
          'message',
          'status',
          'clientName',
          'patientName',
          'productName',
          'notes',
        ]),
      }
      if (editing) await reminders.update(editing.id, indexedPayload)
      else await reminders.create(indexedPayload)
      feedback.success(editing ? 'El recordatorio se actualizó correctamente.' : 'El recordatorio se creó correctamente.')
      setSelectedDate(indexedPayload.date || selectedDate)
      setModalOpen(false)
      reminders.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el recordatorio.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteReminder(row) {
    if (!canWrite) return
    const ok = await feedback.confirm({
      title: 'Eliminar recordatorio',
      message: `¿Eliminar el recordatorio del ${dateLabel(row.date)} ${row.time || ''}?`,
      confirmText: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await reminders.remove(row.id)
      feedback.success('El recordatorio fue eliminado correctamente.')
      reminders.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo eliminar el recordatorio.')
    }
  }

  async function updateReminderStatus(row, status) {
    if (!canWrite) return
    try {
      await reminders.update(row.id, { status, ...buildSearchPayload({ ...row, status }) })
      feedback.success(`Recordatorio marcado como ${status.toLowerCase()}.`)
      reminders.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo actualizar el estado.')
    }
  }

  function getOperationalShiftForSale(date) {
    const options = filterOpenShiftsForUser(shifts.items, user, date || todayISO())
    return options[0] || null
  }

  async function generateSale(row, paid = true) {
    if (!canCreateSale) {
      feedback.warning('No tenés permiso para generar ventas desde recordatorios.')
      return
    }
    if (row.saleGenerated || row.relatedSaleId) {
      feedback.warning('Este recordatorio ya tiene una venta generada.')
      return
    }
    if (!row.productId && !String(row.productName || '').trim()) {
      feedback.warning('Para generar la venta, el recordatorio necesita producto registrado o producto manual.')
      return
    }
    const method = paid ? (row.paymentMethod || 'Efectivo') : 'Cuenta corriente'
    const saleDate = row.date || todayISO()
    const selectedShift = getOperationalShiftForSale(saleDate)
    if (!selectedShift) {
      feedback.warning('Para generar una venta desde recordatorio necesitás un turno de caja abierto y asignado para esa fecha.')
      return
    }
    const ok = await feedback.confirm({
      title: paid ? 'Generar venta cobrada' : 'Cargar venta pendiente',
      message: paid
        ? `Se creará la venta en Ventas, el ingreso en Caja y se marcará el recordatorio como venta cargada. Turno: ${shiftOptionLabel(selectedShift)}.`
        : `Se creará la venta como pendiente/cuenta corriente y se marcará el recordatorio como venta pendiente. Turno: ${shiftOptionLabel(selectedShift)}.`,
      confirmText: paid ? 'Generar venta' : 'Cargar pendiente',
      tone: paid ? 'warning' : 'info',
    })
    if (!ok) return
    setSaving(true)
    try {
      await repository.createReminderSaleTransaction({
        reminderId: row.id,
        date: row.date || todayISO(),
        clientId: row.clientId || '',
        patientId: row.patientId || '',
        clientName: clientMap[row.clientId] || row.clientName || '',
        patientName: patientMap[row.patientId] || row.patientName || '',
        productId: row.productId || '',
        productName: row.productName || productMap[row.productId] || '',
        qty: Math.max(1, numberValue(row.qty) || 1),
        unitPrice: numberValue(row.unitPrice || row.estimatedUnitPrice),
        paymentMethod: method,
        creditSurchargePercent: row.creditSurchargePercent || DEFAULT_CREDIT_SURCHARGE_PERCENT,
        paid: paid && method !== 'Cuenta corriente',
        shiftId: selectedShift.id,
        shiftName: selectedShift.name || '',
        shiftDate: selectedShift.date || saleDate,
        ...shiftUserPayload(selectedShift),
        stockAffected: Boolean(row.affectStock),
        notes: row.notes || row.message || row.title || 'Venta futura generada desde recordatorios.',
      })
      feedback.success(paid ? 'La venta fue generada y cobrada correctamente.' : 'La venta quedó cargada como pendiente.')
      reminders.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo generar la venta.')
    } finally {
      setSaving(false)
    }
  }

  if (!canRead) {
    return (
      <section className="access-denied-panel">
        <div className="system-card system-card-danger">
          <div className="system-icon">!</div>
          <p className="eyebrow">Acceso restringido</p>
          <h1>No tenés permiso para ver recordatorios</h1>
          <p>Solicitá acceso a un administrador del sistema.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Agenda"
        title="Recordatorios"
        description="Calendario mensual de recordatorios y ventas futuras. Podés cargar varios avisos por día, diferenciarlos por color y convertir encargos en ventas cuando el cliente paga."
        actions={
          <>
            <ExportButtons
              title={`Recordatorios ${dateLabel(selectedDate)}`}
              subtitle="Recordatorios filtrados por el día seleccionado. Incluye ventas futuras y estados."
              rows={selectedRows}
              columns={exportColumns}
              summary={[
                { label: 'Día', value: dateLabel(selectedDate) },
                { label: 'Recordatorios visibles', value: selectedRows.length },
              ]}
              fileLabel="recordatorios"
            />
            {canWrite && <button className="btn" onClick={() => openCreate(selectedDate, 'Recordatorio')}>Nuevo recordatorio</button>}
            {canWrite && <button className="btn btn-primary" onClick={() => openCreate(selectedDate, 'Venta futura')}>Nueva venta futura</button>}
          </>
        }
      />

      <div className="agenda-grid reminders-agenda-grid">
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
          <div className="calendar-month" role="grid" aria-label="Calendario de recordatorios">
            {calendarDays.map((day) => {
              const rows = remindersByDate[day.iso] || []
              const isSelected = day.iso === selectedDate
              const isToday = day.iso === todayISO()
              return (
                <button
                  key={day.iso}
                  type="button"
                  className={`calendar-day reminder-calendar-day ${day.currentMonth ? '' : 'muted-day'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                  onClick={() => selectDate(day.iso)}
                >
                  <span className="calendar-day-number">{day.dayNumber}</span>
                  {rows.length > 0 && <strong>{rows.length}</strong>}
                  {rows.length > 0 && (
                    <span className="reminder-day-dots" aria-hidden="true">
                      {rows.slice(0, 5).map((item) => <i key={item.id} className={colorClass(item.color)} />)}
                    </span>
                  )}
                  {rows.slice(0, 2).map((item) => <em key={item.id}>{item.time || '--:--'} {item.title || item.message || item.productName || 'Recordatorio'}</em>)}
                </button>
              )
            })}
          </div>

          <div className="calendar-footer-actions">
            <button className="btn btn-small" type="button" onClick={() => selectDate(todayISO())}>Hoy</button>
            {canWrite && <button className="btn btn-small" type="button" onClick={() => openCreate(selectedDate, 'Recordatorio')}>Agregar recordatorio</button>}
            {canWrite && <button className="btn btn-small btn-primary" type="button" onClick={() => openCreate(selectedDate, 'Venta futura')}>Agregar venta futura</button>}
          </div>
        </article>

        <aside className="agenda-day-panel">
          <div className="stats-grid compact agenda-stats">
            <div className="stat-card"><span>Total del día</span><strong>{dailySummary.total}</strong></div>
            <div className="stat-card tone-warning"><span>Pendientes</span><strong>{dailySummary.pending}</strong></div>
            <div className="stat-card tone-info"><span>Ventas futuras</span><strong>{dailySummary.futureSales}</strong></div>
            <div className="stat-card tone-success"><span>Ventas cargadas</span><strong>{dailySummary.loadedSales}</strong></div>
          </div>

          <div className="panel agenda-filter-panel reminders-filter-panel">
            <input
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, producto, categoría..."
            />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">Todas las categorías</option>
              {CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        </aside>
      </div>

      {reminders.error && <div className="alert alert-danger">{reminders.error}</div>}
      {reminders.loading ? (
        <div className="panel">Cargando recordatorios...</div>
      ) : (
        <>
          <DataTable
            rows={dailyPage.rows}
            columns={columns}
            empty={`No hay recordatorios para el ${dateLabel(selectedDate)}.`}
            actions={(row) => (
            <>
              <IndividualExportActions
                row={row}
                columns={exportColumns}
                title="Recordatorio"
                subtitle="Detalle individual del recordatorio seleccionado."
                fileLabel="recordatorio"
              />
              {canWrite && row.status !== 'Hecho' && row.status !== 'Venta cargada' && <button className="btn btn-small" onClick={() => updateReminderStatus(row, 'Hecho')}>Hecho</button>}
              {canCreateSale && normalizeKind(row.kind) === 'Venta futura' && !row.saleGenerated && !row.relatedSaleId && (
                <button className="btn btn-small btn-primary" disabled={saving} onClick={() => generateSale(row, true)}>Cobrar y vender</button>
              )}
              {canCreateSale && normalizeKind(row.kind) === 'Venta futura' && !row.saleGenerated && !row.relatedSaleId && (
                <button className="btn btn-small" disabled={saving} onClick={() => generateSale(row, false)}>Cargar pendiente</button>
              )}
              {canWrite && <button className="btn btn-small" onClick={() => openEdit(row)}>Editar</button>}
              {canWrite && <button className="btn btn-small btn-danger" onClick={() => deleteReminder(row)}>Eliminar</button>}
            </>
            )}
          />
          <Pagination
            page={dailyPage.page}
            pageCount={dailyPage.pageCount}
            pageSize={dailyPage.pageSize}
            onPageChange={dailyPage.setPage}
            onPageSizeChange={dailyPage.setPageSize}
            total={dailyPage.total}
            rawTotal={selectedRows.length}
          />
        </>
      )}

      {modalOpen && (
        <Modal
          title={editing ? 'Editar recordatorio' : form.kind === 'Venta futura' ? 'Nueva venta futura' : 'Nuevo recordatorio'}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              {form.kind === 'Venta futura' && <strong className="modal-total">Total estimado: {money(previewPricing.total)}</strong>}
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={formId} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          <form id={formId} onSubmit={saveReminder}>
            <FormGrid
              value={form}
              onChange={handleChange}
              fields={[
                { name: 'date', label: 'Día', type: 'date', required: true },
                { name: 'time', label: 'Hora', type: 'time' },
                { name: 'kind', label: 'Tipo', type: 'select', options: KIND_OPTIONS, required: true },
                { name: 'category', label: 'Categoría', type: 'select', options: CATEGORY_OPTIONS, required: true },
                { name: 'color', label: 'Color', type: 'select', options: COLOR_OPTIONS, required: true },
                { name: 'status', label: 'Estado', type: 'select', options: STATUS_OPTIONS },
                { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, hint: 'Opcional para recordatorios internos. Recomendado para ventas futuras.' },
                { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions },
                { name: 'title', label: 'Título corto', placeholder: 'Ej: preparar alimento 15 kg' },
                { name: 'channel', label: 'Canal', type: 'select', options: CHANNEL_OPTIONS },
                { name: 'message', label: 'Detalle / aviso', type: 'textarea', rows: 3, required: true },
              ]}
            />

            {form.kind === 'Venta futura' && (
              <div className="future-sale-form-block">
                <h3>Datos de la venta futura</h3>
                <p className="muted">Esto no descuenta stock al guardar el recordatorio. La venta recién se genera cuando tocás “Cobrar y vender” o “Cargar pendiente”.</p>
                <FormGrid
                  value={form}
                  onChange={handleChange}
                  fields={[
                    { name: 'productId', label: 'Producto registrado', type: 'select', options: productOptions, hint: 'Opcional. Usalo si el producto existe en el sistema.' },
                    { name: 'productName', label: 'Producto manual', placeholder: 'Ej: alimento adulto 15 kg cerrado' },
                    { name: 'qty', label: 'Cantidad', type: 'number', min: 1, required: true },
                    { name: 'unitPrice', label: 'Precio unitario estimado', type: 'number', min: 0, step: '0.01', inputMode: 'decimal' },
                    { name: 'paymentMethod', label: 'Método previsto', type: 'select', options: PAYMENT_METHODS },
                    ...(forcedCreditSurcharge ? [{ name: 'creditSurchargePercent', label: 'Recargo tarjeta crédito (%)', type: 'number', min: 0, max: 100, step: '0.01', inputMode: 'decimal' }] : []),
                    { name: 'affectStock', label: 'Afectar stock al generar la venta', type: 'checkbox', hint: 'Dejalo apagado para encargos que no entran al stock general. Activarlo exige stock suficiente cuando se genera la venta.' },
                    { name: 'notes', label: 'Notas internas de venta', type: 'textarea', rows: 3 },
                  ]}
                />
                <div className="preview-box">
                  <strong>Vista previa:</strong>{' '}
                  {form.productName || selectedProduct?.name || 'Producto pendiente'} x{Math.max(1, numberValue(form.qty) || 1)} · {money(previewPricing.total)}
                  {forcedCreditSurcharge && (
                    <span className="preview-breakdown">
                      Subtotal {money(previewPricing.subtotal)} + recargo {previewPricing.creditSurchargePercent}% ({money(previewPricing.creditSurchargeAmount)}) = {money(previewPricing.total)}
                    </span>
                  )}
                  {form.affectStock && selectedProduct && <span className="preview-breakdown">Stock actual: {selectedProduct.stock ?? 0}. Se descontará solo al generar la venta.</span>}
                </div>
              </div>
            )}
          </form>
        </Modal>
      )}
    </section>
  )
}
