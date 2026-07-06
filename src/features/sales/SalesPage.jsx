import React, { useEffect, useId, useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { ListToolbar } from '../../components/ui/ListToolbar.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { IndividualExportActions } from '../../components/export/IndividualExportActions.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useServerCollectionControls } from '../../hooks/useServerCollectionControls.js'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, numberValue, sumBy, todayISO } from '../../utils/formatters.js'
import {
  DEFAULT_CREDIT_SURCHARGE_PERCENT,
  calculateSalePricing,
  isCreditPaymentMethod,
  paymentLabelWithSurcharge,
} from '../../utils/salesPricing.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { findOpenDailyCashSession, isSharedDailyCashSession, shiftOptionLabel, shiftUserPayload, userOperationId, userOperationName } from '../../utils/shifts.js'
import { TagFilter } from '../../components/tags/TagFilter.jsx'
import { TagList } from '../../components/tags/TagBadge.jsx'
import { tagNamesFromIds, tagOptionsForScope, tagsForScope } from '../../data/tagScopes.js'
import { SalesCalendarPanel, buildCalendarDays, summarizeSalesByDate, toDateAtNoon } from './SalesCalendarPanel.jsx'

const paymentMethods = ['Efectivo', 'Transferencia', 'Debito', 'Credito', 'Cuenta corriente']

const initialForm = {
  date: todayISO(),
  clientId: '',
  patientId: '',
  shiftId: '',
  productId: '',
  qty: 1,
  paymentMethod: 'Efectivo',
  creditSurchargePercent: DEFAULT_CREDIT_SURCHARGE_PERCENT,
  paid: true,
  dueDate: '',
  notes: '',
  tagIds: [],
}

function uniqueOptions(options) {
  return options.filter((option, index, all) => all.findIndex((item) => item.value === option.value) === index)
}

export function SalesPage() {
  const [shiftFilter, setShiftFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [monthDate, setMonthDate] = useState(toDateAtNoon(todayISO()))
  const calendarDays = useMemo(() => buildCalendarDays(monthDate), [monthDate])
  const monthRange = useMemo(() => ({
    start: calendarDays[0]?.iso || selectedDate,
    end: calendarDays.at(-1)?.iso || selectedDate,
  }), [calendarDays, selectedDate])
  const extraWhere = useMemo(() => [
    ...(shiftFilter ? [{ field: 'shiftId', op: '==', value: shiftFilter }] : []),
    ...(methodFilter ? [{ field: 'paymentMethod', op: '==', value: methodFilter }] : []),
    ...(tagFilter ? [{ field: 'tagIds', op: 'array-contains', value: tagFilter }] : []),
  ], [methodFilter, shiftFilter, tagFilter])
  const sales = useServerCollectionControls('sales', {
    dateField: 'date',
    statusField: 'status',
    orderByField: 'date',
    orderDirection: 'desc',
    initialDateFrom: todayISO(),
    initialDateTo: todayISO(),
    extraWhere,
  })
  const monthlySales = useCollection('sales', {
    where: [
      { field: 'date', op: '>=', value: monthRange.start },
      { field: 'date', op: '<=', value: monthRange.end },
      ...(sales.status ? [{ field: 'status', op: '==', value: sales.status }] : []),
      ...extraWhere,
    ],
    limitCount: 1000,
    orderByField: 'date',
    orderDirection: 'asc',
  })
  const products = useCollection('products', { limitCount: 300, orderByField: 'name', orderDirection: 'asc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const tagsCollection = useCollection('tags', { limitCount: 250, orderByField: 'name', orderDirection: 'asc' })
  const { clientOptions, patientOptionsForClient, clientMap, patientMap, productOptions, productMap, clientById, patientById } = useLookups()
  const [modalOpen, setModalOpen] = useState(false)
  const [voidingSale, setVoidingSale] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [createdCashSession, setCreatedCashSession] = useState(null)
  const saleFormId = useId()
  const voidFormId = useId()
  const feedback = useFeedback()
  const { hasPermission, user } = useAuth()
  const canWrite = hasPermission('ventas.write')
  const canManageCashSession = hasPermission('caja.close')

  const visibleCashSessions = useMemo(() => [
    ...shifts.items,
    ...(createdCashSession ? [createdCashSession] : []),
  ].filter(Boolean), [createdCashSession, shifts.items])

  const shiftOptions = useMemo(() => visibleCashSessions
    .filter((item) => isSharedDailyCashSession(item))
    .map((item) => ({
      value: item.id,
      label: `${dateLabel(item.date)} - ${shiftOptionLabel(item)}`,
    })), [visibleCashSessions])

  const saleTags = useMemo(() => tagsForScope(tagsCollection.items, 'sales'), [tagsCollection.items])
  const saleTagOptions = useMemo(() => tagOptionsForScope(tagsCollection.items, 'sales'), [tagsCollection.items])

  const openShiftOptionsForSale = useMemo(() => {
    const shift = findOpenDailyCashSession(visibleCashSessions, form.date)
    return shift ? [{ value: shift.id, label: shiftOptionLabel(shift) }] : []
  }, [form.date, visibleCashSessions])

  useEffect(() => {
    if (form.shiftId || !openShiftOptionsForSale.length) return
    setForm((current) => ({ ...current, shiftId: openShiftOptionsForSale[0].value }))
  }, [form.shiftId, openShiftOptionsForSale])

  const selectedShift = useMemo(
    () => visibleCashSessions.find((item) => item.id === form.shiftId) || null,
    [form.shiftId, visibleCashSessions],
  )

  const activeSales = sales.items.filter((item) => item.status !== 'Anulada')
  const pending = activeSales.filter((item) => !item.paid)
  const paid = activeSales.filter((item) => item.paid)
  const totalPending = sumBy(pending, (item) => item.total)
  const totalPaid = sumBy(paid, (item) => item.total)
  const voidedCount = sales.items.filter((item) => item.status === 'Anulada').length

  const selectedProduct = useMemo(
    () => products.items.find((item) => item.id === form.productId),
    [products.items, form.productId],
  )

  const previewSubtotal = numberValue(form.qty) * numberValue(selectedProduct?.price)
  const salePricing = calculateSalePricing({
    subtotal: previewSubtotal,
    paymentMethod: form.paymentMethod,
    creditSurchargePercent: form.creditSurchargePercent,
  })
  const previewTotal = salePricing.total
  const forcedCurrentAccount = form.paymentMethod === 'Cuenta corriente'
  const forcedCreditSurcharge = isCreditPaymentMethod(form.paymentMethod)
  const totalsByShift = activeSales.reduce((acc, item) => {
    const key = item.shiftName || (item.shiftId ? 'Caja sin nombre' : 'Sin caja')
    acc[key] = (acc[key] || 0) + numberValue(item.total)
    return acc
  }, {})
  const totalsByMethod = activeSales.reduce((acc, item) => {
    const key = item.paymentMethod || 'Sin metodo'
    acc[key] = (acc[key] || 0) + numberValue(item.total)
    return acc
  }, {})
  const salesByDate = useMemo(() => summarizeSalesByDate(monthlySales.items), [monthlySales.items])

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'shiftName', label: 'Caja', render: (row) => row.shiftName || 'Sin caja' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || row.clientName || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || row.patientName || '-' },
    { key: 'items', label: 'Detalle', render: (row) => row.items?.map((item) => `${item.name} x${item.qty}`).join(', ') || '-' },
    { key: 'userEmail', label: 'Vendido por', render: (row) => row.userEmail || '-' },
    { key: 'paymentMethod', label: 'Pago', render: (row) => paymentLabelWithSurcharge(row.paymentMethod, row.creditSurchargePercent) },
    { key: 'total', label: 'Total', render: (row) => money(row.total) },
    { key: 'paymentStatus', label: 'Estado', render: (row) => row.status === 'Anulada' ? 'Anulada' : row.paid ? 'Pagada' : 'Pendiente' },
    { key: 'tagIds', label: 'Etiquetas', render: (row) => <TagList tagIds={row.tagIds} tags={saleTags} /> },
  ]

  const exportColumns = [
    ...columns,
    { key: 'shiftDate', label: 'Fecha caja' },
    { key: 'subtotal', label: 'Subtotal', exportValue: (row) => money(row.subtotal || row.total) },
    { key: 'creditSurchargePercent', label: 'Recargo credito %', exportValue: (row) => row.creditSurchargePercent ? `${row.creditSurchargePercent}%` : '-' },
    { key: 'creditSurchargeAmount', label: 'Recargo credito $', exportValue: (row) => row.creditSurchargeAmount ? money(row.creditSurchargeAmount) : '-' },
    { key: 'cashMovementId', label: 'Mov. caja' },
    { key: 'currentAccountId', label: 'Cuenta corriente' },
    { key: 'clientPhone', label: 'Telefono cliente', exportValue: (row) => clientById[row.clientId]?.phone || '-' },
    { key: 'clientEmail', label: 'Email cliente', exportValue: (row) => clientById[row.clientId]?.email || '-' },
    { key: 'clientAddress', label: 'Direccion cliente', exportValue: (row) => clientById[row.clientId]?.address || '-' },
    { key: 'patientSpecies', label: 'Especie paciente', exportValue: (row) => patientById[row.patientId]?.species || '-' },
    { key: 'patientBreed', label: 'Raza paciente', exportValue: (row) => patientById[row.patientId]?.breed || '-' },
    { key: 'voidReason', label: 'Motivo anulacion' },
    { key: 'tagIds', label: 'Etiquetas', exportValue: (row) => tagNamesFromIds(row.tagIds, saleTags).join(', ') || '-' },
    { key: 'notes', label: 'Notas' },
  ]

  function handleChange(name, value, field) {
    setForm((current) => {
      const normalizedValue = name === 'creditSurchargePercent' && typeof value === 'string'
        ? value.replace(',', '.')
        : value
      let next = {
        ...current,
        [name]: normalizedValue,
        ...(name === 'date' ? { shiftId: '' } : {}),
        ...(name === 'paymentMethod' && value === 'Cuenta corriente' ? { paid: false } : {}),
        ...(name === 'paymentMethod' && current.paymentMethod === 'Cuenta corriente' && value !== 'Cuenta corriente' ? { paid: true } : {}),
      }
      if (typeof field?.onChange === 'function') {
        const patch = field.onChange({ value, form: next, previousForm: current, field })
        if (patch && typeof patch === 'object') next = { ...next, ...patch }
      }
      if (name === 'paymentMethod' && isCreditPaymentMethod(value)) {
        next.creditSurchargePercent = current.creditSurchargePercent || DEFAULT_CREDIT_SURCHARGE_PERCENT
        next.paid = true
      }
      return next
    })
  }

  function selectCalendarDate(isoDate) {
    setSelectedDate(isoDate)
    setMonthDate(toDateAtNoon(isoDate))
    sales.setDateFrom(isoDate)
    sales.setDateTo(isoDate)
    sales.setPage?.(1)
  }

  function moveCalendarMonth(offset) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0))
  }

  function openSaleForDate(isoDate) {
    setForm((current) => ({ ...current, date: isoDate, shiftId: '' }))
    setModalOpen(true)
  }

  function clearAllFilters() {
    setShiftFilter('')
    setMethodFilter('')
    setTagFilter('')
    setSelectedDate(todayISO())
    setMonthDate(toDateAtNoon(todayISO()))
    sales.setQuery('')
    sales.setStatus('')
    sales.setDateFrom(todayISO())
    sales.setDateTo(todayISO())
    sales.setPage?.(1)
  }


  useEffect(() => {
    if (sales.dateFrom && sales.dateFrom === sales.dateTo && sales.dateFrom !== selectedDate) {
      setSelectedDate(sales.dateFrom)
      setMonthDate(toDateAtNoon(sales.dateFrom))
    }
  }, [sales.dateFrom, sales.dateTo, selectedDate])


  async function openCashSession() {
    if (!canManageCashSession) {
      feedback.warning('No tenés permiso para abrir cajas del día. Pedile a un administrador que abra la caja diaria.')
      return
    }

    setSaving(true)
    try {
      const now = new Date()
      const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const session = await repository.ensureDailyCashSession({
        date: form.date,
        startTime,
        openedBy: userOperationId(user),
        openedByName: userOperationName(user),
        notes: 'Caja diaria compartida abierta desde Ventas.',
      })
      setCreatedCashSession(session)
      shifts.refresh?.()
      setForm((current) => ({ ...current, shiftId: session.id }))
      if (session.status === 'Cerrado') {
        feedback.warning('La caja del día ya existe pero está cerrada. No se pueden cargar ventas nuevas.')
      } else {
        feedback.success(session.created ? 'Caja del día abierta. Ya podés cargar ventas.' : 'Caja del día ya estaba abierta. Se reutiliza la misma caja compartida.')
      }
    } catch (error) {
      feedback.error(error?.message || 'No se pudo abrir la caja del día.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSale(event) {
    event.preventDefault()
    if (!canWrite) {
      feedback.warning('No tenes permiso para crear ventas.')
      return
    }
    if (!selectedProduct) return
    if (!form.shiftId) {
      feedback.warning('No hay caja del día abierta. Abrí la caja diaria para poder registrar ventas.')
      return
    }
    if (!selectedShift) {
      feedback.warning('La caja seleccionada ya no está disponible.')
      return
    }
    if (selectedShift.status === 'Cerrado') {
      feedback.warning('No se puede registrar una venta en una caja cerrada.')
      return
    }
    setSaving(true)
    try {
      await repository.createSaleTransaction({
        ...form,
        shiftName: 'Caja del día',
        shiftDate: selectedShift.date || form.date,
        ...shiftUserPayload(selectedShift),
        qty: numberValue(form.qty) || 1,
        creditSurchargePercent: salePricing.creditSurchargePercent,
        paid: forcedCurrentAccount ? false : Boolean(form.paid),
        clientName: clientMap[form.clientId] || '',
        patientName: patientMap[form.patientId] || '',
        tagIds: Array.isArray(form.tagIds) ? form.tagIds : [],
        tagNames: tagNamesFromIds(form.tagIds, saleTags),
      })
      feedback.success('La venta se registro con stock, caja/cuenta corriente y auditoria en una sola operacion.')
      sales.refresh?.()
      setModalOpen(false)
      setForm((current) => ({
        ...initialForm,
        date: current.date,
        shiftId: current.shiftId,
        paymentMethod: current.paymentMethod,
        creditSurchargePercent: current.creditSurchargePercent || DEFAULT_CREDIT_SURCHARGE_PERCENT,
        paid: current.paymentMethod !== 'Cuenta corriente',
      }))
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la venta.')
    } finally {
      setSaving(false)
    }
  }

  async function markAsPaid(row) {
    if (!canWrite) {
      feedback.warning('No tenes permiso para cobrar ventas.')
      return
    }
    const ok = await feedback.confirm({
      title: 'Cobrar venta pendiente',
      message: 'Se creara el ingreso de caja y, si corresponde, se cancelara la cuenta corriente vinculada.',
      confirmText: 'Cobrar',
      tone: 'warning',
    })
    if (!ok) return
    const rowShift = findOpenDailyCashSession(visibleCashSessions, todayISO())
    if (!rowShift) {
      feedback.warning('No hay caja del día abierta. Abrí la caja diaria para poder cobrar esta venta.')
      return
    }
    try {
      await repository.collectSaleTransaction(row, {
        date: todayISO(),
        method: row.paymentMethod === 'Cuenta corriente' ? 'Efectivo' : row.paymentMethod,
        shiftId: rowShift.id,
        shiftName: 'Caja del día',
        shiftDate: rowShift.date || row.shiftDate || row.date || todayISO(),
        ...shiftUserPayload(rowShift),
      })
      feedback.success('La venta quedo cobrada y trazada en caja/auditoria.')
      sales.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo cobrar la venta.')
    }
  }

  function openVoid(row) {
    setVoidingSale(row)
    setVoidReason('')
  }

  async function confirmVoid(event) {
    event.preventDefault()
    if (!canWrite || !voidingSale) return
    if (!voidReason.trim()) {
      feedback.warning('Indica un motivo de anulacion.')
      return
    }
    setSaving(true)
    try {
      await repository.voidSaleTransaction(voidingSale, { reason: voidReason.trim(), date: todayISO() })
      feedback.success('La venta fue anulada. Se revirtio stock/caja/cuenta corriente cuando correspondia.')
      sales.refresh?.()
      setVoidingSale(null)
      setVoidReason('')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo anular la venta.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Comercial"
        title="Ventas"
        description="Comprobantes y cobros por día. La caja se asigna automáticamente cuando existe la caja diaria compartida abierta. Stock, deuda y auditoría quedan sincronizados."
        actions={
          <>
            <ExportButtons
              title="Ventas"
              subtitle="Listado filtrado de ventas con datos de contacto, paciente, caja, deuda y estado."
              rows={sales.items}
              getRows={sales.fetchAllForExport}
              columns={exportColumns}
              summary={[
                { label: 'Total cobrado', value: money(totalPaid) },
                { label: 'Pendiente', value: money(totalPending) },
                { label: 'Ventas visibles en página', value: sales.items.length },
              ]}
              fileLabel="ventas"
            />
            {canWrite && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Nueva venta</button>}
          </>
        }
      />

      <div className="stats-grid compact">
        <StatCard label="Total cobrado" value={money(totalPaid)} tone="success" />
        <StatCard label="Pendiente" value={money(totalPending)} tone="warning" />
        <StatCard label="Ventas activas" value={activeSales.length} />
        <StatCard label="Anuladas" value={voidedCount} tone="danger" />
      </div>

      <SalesCalendarPanel
        calendarDays={calendarDays}
        monthDate={monthDate}
        selectedDate={selectedDate}
        salesByDate={salesByDate}
        monthLoading={monthlySales.loading}
        onMoveMonth={moveCalendarMonth}
        onSelectDate={selectCalendarDate}
        onCreateSale={openSaleForDate}
        canWrite={canWrite}
      />

      <div className="panel method-summary">
        <h2>Resumen del rango por caja y método</h2>
        <div className="inline-metrics">
          {Object.entries(totalsByShift).map(([shift, amount]) => (
            <span className="metric-pill" key={shift}>{shift}: <strong>{money(amount)}</strong></span>
          ))}
          {Object.entries(totalsByMethod).map(([method, amount]) => (
            <span className="metric-pill" key={method}>{method}: <strong>{money(amount)}</strong></span>
          ))}
          {!Object.keys(totalsByShift).length && <span className="muted">Sin ventas para el rango seleccionado.</span>}
        </div>
      </div>

      <ListToolbar
        query={sales.query}
        onQueryChange={sales.setQuery}
        placeholder="Buscar venta por cliente, paciente, producto, fecha o metodo..."
        dateFrom={sales.dateFrom}
        dateTo={sales.dateTo}
        onDateFromChange={sales.setDateFrom}
        onDateToChange={sales.setDateTo}
        status={sales.status}
        onStatusChange={sales.setStatus}
        statusOptions={['Activa', 'Anulada']}
        extraActive={Boolean(tagFilter)}
        onClearFilters={clearAllFilters}
      >
        <TagFilter value={tagFilter} options={saleTagOptions} onChange={setTagFilter} />
      </ListToolbar>

      <div className="panel compact-card">
        <div className="form-grid">
          <label className="field">
            <span>Caja</span>
            <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
              <option value="">Todos</option>
              {shiftOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Metodo de pago</span>
            <select value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
              <option value="">Todos</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
        </div>
      </div>

      <DataTable
        rows={sales.items}
        columns={columns}
        actions={(row) => (
          <>
            <IndividualExportActions row={row} columns={exportColumns} title="Venta" fileLabel="venta" />
            {canWrite && row.status !== 'Anulada' && !row.paid && <button className="btn btn-small" onClick={() => markAsPaid(row)}>Cobrar</button>}
            {canWrite && row.status !== 'Anulada' && <button className="btn btn-small btn-danger" onClick={() => openVoid(row)}>Anular</button>}
          </>
        )}
      />
      <Pagination {...sales} onPageSizeChange={sales.setPageSize} total={sales.items.length} limit={sales.pageSize} />

      {modalOpen && (
        <Modal
          title="Nueva venta"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <strong className="modal-total">Total: {money(previewTotal)}</strong>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={saleFormId} disabled={saving || !selectedProduct}>
                {saving ? 'Guardando...' : 'Guardar venta'}
              </button>
            </>
          }
        >
          <form id={saleFormId} onSubmit={saveSale}>
            <FormGrid
              value={form}
              onChange={handleChange}
              fields={[
                { name: 'date', label: 'Fecha', type: 'date', required: true },
                { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true, searchPlaceholder: 'Buscar tutor...', onChange: () => ({ patientId: '' }) },
                { name: 'patientId', label: 'Paciente', type: 'select', options: ({ form }) => patientOptionsForClient(form.clientId, form.patientId), disabled: ({ form }) => !form.clientId, searchPlaceholder: 'Buscar paciente del tutor...', hint: ({ form }) => form.clientId ? 'Solo se muestran pacientes del tutor seleccionado.' : 'Primero seleccioná un tutor.' },
                { name: 'productId', label: 'Producto / servicio', type: 'select', options: productOptions, required: true },
                { name: 'qty', label: 'Cantidad', type: 'number' },
                { name: 'paymentMethod', label: 'Metodo', type: 'select', options: paymentMethods },
                ...(forcedCreditSurcharge ? [{ name: 'creditSurchargePercent', label: 'Recargo tarjeta credito (%)', type: 'number', min: '0', max: '100', step: '0.01', inputMode: 'decimal', placeholder: '15', hint: 'Al elegir Credito se carga 15% por defecto. Podes escribir otro porcentaje antes de guardar.' }] : []),
                { name: 'paid', label: 'Pagado', type: 'checkbox', disabled: forcedCurrentAccount, hint: forcedCurrentAccount ? 'Cuenta corriente siempre queda pendiente.' : '' },
                { name: 'dueDate', label: 'Vencimiento cuenta corriente', type: 'date' },
                { name: 'tagIds', label: 'Etiquetas', type: 'tagPicker', options: saleTagOptions, hint: saleTagOptions.length ? 'Opcional. Clasifica la venta para filtrar después.' : 'Creá etiquetas desde Configuración > Etiquetas.' },
                { name: 'notes', label: 'Notas', type: 'textarea' },
              ]}
            />
            {!form.shiftId && (
              <div className="system-card system-card-warning compact-card">
                <strong>No hay caja del día abierta.</strong> Abrí la caja diaria para poder registrar ventas.
                {canManageCashSession && (
                  <button className="btn btn-small" type="button" onClick={openCashSession} disabled={saving}>
                    Abrir caja del día
                  </button>
                )}
              </div>
            )}
            {selectedProduct && (
              <div className="preview-box">
                {productMap[selectedProduct.id]} - Precio {money(selectedProduct.price)} - Stock {selectedProduct.stock} - {selectedProduct.type}
                {forcedCreditSurcharge && (
                  <span className="preview-breakdown">
                    Subtotal {money(salePricing.subtotal)} + recargo {salePricing.creditSurchargePercent}% ({money(salePricing.creditSurchargeAmount)}) = {money(salePricing.total)}
                  </span>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}

      {voidingSale && (
        <Modal
          title="Anular venta"
          onClose={() => setVoidingSale(null)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setVoidingSale(null)}>Cancelar</button>
              <button className="btn btn-danger-solid" type="submit" form={voidFormId} disabled={saving}>
                {saving ? 'Anulando...' : 'Anular venta'}
              </button>
            </>
          }
        >
          <form id={voidFormId} onSubmit={confirmVoid}>
            <div className="system-card system-card-warning compact-card">
              Esta accion no borra la venta: la marca como anulada, revierte stock si corresponde, anula el movimiento de caja abierto y deja auditoria.
            </div>
            <FormGrid
              value={{ reason: voidReason }}
              onChange={(_name, value) => setVoidReason(value)}
              fields={[{ name: 'reason', label: 'Motivo obligatorio', type: 'textarea', required: true, rows: 4 }]}
            />
          </form>
        </Modal>
      )}
    </section>
  )
}
