import React, { useId, useMemo, useState } from 'react'
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
import { dateLabel, money, numberValue, sumBy, todayISO } from '../../utils/formatters.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { filterOpenShiftsForUser, isUserAssignedToShift, shiftOptionLabel, shiftUserPayload } from '../../utils/shifts.js'

const initialForm = { date: todayISO(), shiftId: '', type: 'Ingreso', concept: '', method: 'Efectivo', amount: 0 }

export function CashPage() {
  const [shiftFilter, setShiftFilter] = useState('')
  const extraWhere = useMemo(() => [
    ...(shiftFilter ? [{ field: 'shiftId', op: '==', value: shiftFilter }] : []),
  ], [shiftFilter])
  const cash = useServerCollectionControls('cashMovements', {
    dateField: 'date',
    statusField: 'status',
    orderByField: 'date',
    orderDirection: 'desc',
    initialDateFrom: todayISO(),
    initialDateTo: todayISO(),
    extraWhere,
  })
  const closures = useCollection('cashClosures', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const globalClosures = useCollection('globalCashClosures', { limitCount: 60, orderByField: 'date', orderDirection: 'desc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const movementFormId = useId()
  const feedback = useFeedback()
  const { hasPermission, user } = useAuth()
  const canWrite = hasPermission('caja.write')
  const canClose = hasPermission('caja.close')

  const shiftOptions = useMemo(() => shifts.items
    .filter((item) => user?.role === 'admin' || isUserAssignedToShift(item, user))
    .map((item) => ({
      value: item.id,
      label: `${dateLabel(item.date)} - ${item.name || 'Sin nombre'} (${item.status || 'Abierto'}) · ${item.veterinarianNames?.join(', ') || 'Sin responsable'}`,
    })), [shifts.items, user])
  const formShiftOptions = useMemo(() => filterOpenShiftsForUser(shifts.items, user, form.date)
    .map((item) => ({
      value: item.id,
      label: shiftOptionLabel(item),
    })), [form.date, shifts.items, user])

  const openMovements = cash.items.filter((item) => !item.closed && item.status !== 'Anulado')
  const income = sumBy(openMovements.filter((item) => item.type === 'Ingreso'), (item) => item.amount)
  const expenses = sumBy(openMovements.filter((item) => item.type === 'Egreso'), (item) => item.amount)

  const byMethod = useMemo(() => {
    return openMovements.reduce((acc, item) => {
      const key = item.method || 'Sin metodo'
      acc[key] = (acc[key] || 0) + (item.type === 'Ingreso' ? numberValue(item.amount) : -numberValue(item.amount))
      return acc
    }, {})
  }, [openMovements])

  const movementColumns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'shiftName', label: 'Turno', render: (row) => row.shiftName || 'Sin turno' },
    { key: 'type', label: 'Tipo' },
    { key: 'concept', label: 'Concepto' },
    { key: 'method', label: 'Metodo' },
    { key: 'userEmail', label: 'Registrado por', render: (row) => row.userEmail || '-' },
    { key: 'amount', label: 'Importe', render: (row) => money(row.amount) },
    { key: 'status', label: 'Estado', render: (row) => row.status || (row.closed ? 'Cerrado' : 'Activo') },
    { key: 'closed', label: 'Cierre', render: (row) => row.closed ? 'Cerrado' : 'Abierto' },
  ]

  const closureColumns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'shiftName', label: 'Turno', render: (row) => row.shiftName || (row.closureType === 'legacy' ? 'Legacy/Sin turno' : '-') },
    { key: 'income', label: 'Ingresos', render: (row) => money(row.income) },
    { key: 'expenses', label: 'Egresos', render: (row) => money(row.expenses) },
    { key: 'net', label: 'Neto', render: (row) => money(row.net) },
    { key: 'movementCount', label: 'Movimientos', render: (row) => row.movementCount || row.movementIds?.length || 0 },
    { key: 'userEmail', label: 'Cerrado por', render: (row) => row.userEmail || row.closedBy || '-' },
    { key: 'status', label: 'Estado' },
  ]

  function handleChange(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'date' ? { shiftId: '' } : {}),
    }))
  }

  function clearAllFilters() {
    cash.clearFilters()
    setShiftFilter('')
  }

  async function saveMovement(event) {
    event.preventDefault()
    if (!canWrite) {
      feedback.warning('No tenes permiso para crear movimientos de caja.')
      return
    }
    const movementShift = shifts.items.find((item) => item.id === form.shiftId)
    if (!movementShift) {
      feedback.warning('Seleccioná un turno de caja abierto para el movimiento.')
      return
    }
    setSaving(true)
    try {
      if (movementShift.status === 'Cerrado') {
        feedback.warning('No se puede operar sobre un turno cerrado.')
        return
      }
      await repository.createCashMovementTransaction({
        ...form,
        amount: numberValue(form.amount),
        shiftName: movementShift.name || '',
        shiftDate: movementShift.date || form.date,
        ...shiftUserPayload(movementShift),
      })
      feedback.success('El movimiento de caja se guardo con auditoria automatica.')
      cash.refresh?.()
      setForm(initialForm)
      setModalOpen(false)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  async function closeCash() {
    if (!canClose) {
      feedback.warning('No tenes permiso para cerrar caja.')
      return
    }
    const closeShift = shifts.items.find((item) => item.id === shiftFilter)
    if (!closeShift) {
      feedback.warning('Seleccioná un turno de caja para cerrar.')
      return
    }
    const ok = await feedback.confirm({
      title: 'Cerrar caja del turno',
      message: 'El cierre será inmutable. Los movimientos abiertos del turno quedarán vinculados al cierre y el turno pasará a Cerrado.',
      confirmText: 'Cerrar turno',
      tone: 'warning',
    })
    if (!ok) return
    setSaving(true)
    try {
      if (closeShift.status === 'Cerrado') {
        feedback.warning('Ese turno ya está cerrado.')
        return
      }
      if (user?.role !== 'admin' && !isUserAssignedToShift(closeShift, user)) {
        feedback.warning('Tu usuario no está asignado al turno de caja seleccionado.')
        return
      }
      await repository.closeCashTransaction({
        date: closeShift.date || cash.dateFrom || todayISO(),
        shiftId: closeShift.id,
        shiftName: closeShift.name || '',
        shiftDate: closeShift.date || cash.dateFrom || todayISO(),
        ...shiftUserPayload(closeShift),
      })
      feedback.success('La caja del turno se cerro correctamente con auditoria.')
      cash.refresh?.()
      closures.refresh?.()
      shifts.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo cerrar la caja.')
    } finally {
      setSaving(false)
    }
  }

  async function closeGlobalCash() {
    if (!canClose) {
      feedback.warning('No tenes permiso para cierre global.')
      return
    }
    const date = cash.dateFrom || todayISO()
    const ok = await feedback.confirm({
      title: 'Cerrar caja global diaria',
      message: `Se consolidaran los cierres de turno del dia ${date}. No debe haber turnos abiertos.`,
      confirmText: 'Cerrar global',
      tone: 'warning',
    })
    if (!ok) return
    setSaving(true)
    try {
      await repository.closeGlobalCashTransaction({ date })
      feedback.success('El cierre global diario se genero correctamente.')
      closures.refresh?.()
      globalClosures.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo cerrar la caja global.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Administracion"
        title="Caja por turno de caja"
        description="Caja transaccional por turno operativo: movimientos, ventas cobradas, cierre por responsable y cierre global diario consolidado."
        actions={
          <>
            <ExportButtons
              title="Movimientos de caja"
              subtitle="Movimientos filtrados con turno, tipo, metodo, importe, estado y cierre."
              rows={cash.items}
              getRows={cash.fetchAllForExport}
              columns={movementColumns}
              summary={[
                { label: 'Ingresos abiertos', value: money(income) },
                { label: 'Egresos abiertos', value: money(expenses) },
                { label: 'Neto abierto', value: money(income - expenses) },
              ]}
              fileLabel="movimientos-caja"
            />
            {canClose && <button className="btn" onClick={closeGlobalCash} disabled={saving}>{saving ? 'Procesando...' : 'Cierre global'}</button>}
            {canClose && <button className="btn" onClick={closeCash} disabled={saving || openMovements.length === 0}>{saving ? 'Procesando...' : 'Cerrar turno'}</button>}
            {canWrite && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Nuevo movimiento</button>}
          </>
        }
      />

      <div className="stats-grid compact">
        <StatCard label="Ingresos abiertos" value={money(income)} tone="success" />
        <StatCard label="Egresos abiertos" value={money(expenses)} tone="danger" />
        <StatCard label="Neto abierto" value={money(income - expenses)} tone="info" />
      </div>

      <div className="panel method-summary">
        <h2>Resumen abierto por método</h2>
        <div className="inline-metrics">
          {Object.entries(byMethod).length === 0 ? <span className="muted">Sin movimientos abiertos.</span> : Object.entries(byMethod).map(([method, amount]) => (
            <span className="metric-pill" key={method}>{method}: <strong>{money(amount)}</strong></span>
          ))}
        </div>
      </div>

      <div className="two-column two-column-wide">
        <article className="panel">
          <h2>Movimientos</h2>
          <ListToolbar
            query={cash.query}
            onQueryChange={cash.setQuery}
            placeholder="Buscar por fecha, concepto, tipo o metodo..."
            dateFrom={cash.dateFrom}
            dateTo={cash.dateTo}
            onDateFromChange={cash.setDateFrom}
            onDateToChange={cash.setDateTo}
            status={cash.status}
            onStatusChange={cash.setStatus}
            statusOptions={['Activo', 'Anulado']}
            onClearFilters={clearAllFilters}
          />
          <div className="panel compact-card">
            <label className="field">
              <span>Turno de caja</span>
              <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
                <option value="">Todos</option>
                {shiftOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <DataTable
            rows={cash.items}
            columns={movementColumns}
            actions={(row) => <IndividualExportActions row={row} columns={movementColumns} title="Movimiento de caja" fileLabel="movimiento-caja" />}
          />
          <Pagination {...cash} onPageSizeChange={cash.setPageSize} total={cash.items.length} limit={cash.pageSize} />
        </article>
        <article className="panel">
          <div className="panel-title-row">
            <h2>Cierres</h2>
            <ExportButtons
              title="Cierres de caja"
              subtitle="Historial de cierres con turno, ingresos, egresos, neto y cantidad de movimientos incluidos."
              rows={closures.items}
              columns={closureColumns}
              summary={[{ label: 'Cierres', value: closures.items.length }]}
              fileLabel="cierres-caja"
            />
          </div>
          <DataTable
            rows={closures.items}
            columns={closureColumns}
            actions={(row) => <IndividualExportActions row={row} columns={closureColumns} title="Cierre de caja" fileLabel="cierre-caja" />}
          />
          <div className="panel-title-row section-subtitle">
            <h2>Cierres globales</h2>
          </div>
          <DataTable
            rows={globalClosures.items}
            columns={closureColumns}
            actions={(row) => <IndividualExportActions row={row} columns={closureColumns} title="Cierre global" fileLabel="cierre-global" />}
          />
        </article>
      </div>

      {modalOpen && (
        <Modal
          title="Nuevo movimiento de caja"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={movementFormId} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </>
          }
        >
          <form id={movementFormId} onSubmit={saveMovement}>
            <FormGrid
              value={form}
              onChange={handleChange}
              fields={[
                { name: 'date', label: 'Fecha', type: 'date' },
                { name: 'shiftId', label: 'Turno de caja abierto', type: 'select', options: formShiftOptions, required: true, hint: formShiftOptions.length ? 'Solo aparecen turnos abiertos asignados a tu usuario.' : 'No hay turnos de caja abiertos/asignados para la fecha seleccionada.' },
                { name: 'type', label: 'Tipo', type: 'select', options: ['Ingreso', 'Egreso'] },
                { name: 'concept', label: 'Concepto', required: true },
                { name: 'method', label: 'Metodo', type: 'select', options: ['Efectivo', 'Transferencia', 'Debito', 'Credito', 'Otro'] },
                { name: 'amount', label: 'Importe', type: 'number' },
              ]}
            />
          </form>
        </Modal>
      )}
    </section>
  )
}
