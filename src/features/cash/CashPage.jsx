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
import { dateLabel, money, numberValue, sumBy, todayISO } from '../../utils/formatters.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { findDailyCashSession, findOpenDailyCashSession, isSharedDailyCashSession, shiftOptionLabel, shiftUserPayload, userOperationId, userOperationName } from '../../utils/shifts.js'

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
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [createdCashSession, setCreatedCashSession] = useState(null)
  const movementFormId = useId()
  const feedback = useFeedback()
  const { hasPermission, user } = useAuth()
  const canWrite = hasPermission('caja.write')
  const canClose = hasPermission('caja.close')

  const visibleCashSessions = useMemo(() => [
    ...shifts.items,
    ...(createdCashSession ? [createdCashSession] : []),
  ].filter(Boolean), [createdCashSession, shifts.items])
  const selectedCashDate = cash.dateFrom || todayISO()
  const dailyCashSession = useMemo(() => findDailyCashSession(visibleCashSessions, selectedCashDate), [selectedCashDate, visibleCashSessions])
  const openDailyCashSessionForForm = useMemo(() => findOpenDailyCashSession(visibleCashSessions, form.date), [form.date, visibleCashSessions])

  const shiftOptions = useMemo(() => visibleCashSessions
    .filter((item) => isSharedDailyCashSession(item))
    .map((item) => ({
      value: item.id,
      label: `${dateLabel(item.date)} - ${shiftOptionLabel(item)}`,
    })), [visibleCashSessions])
  const formShiftOptions = useMemo(() => openDailyCashSessionForForm ? [{
    value: openDailyCashSessionForForm.id,
    label: shiftOptionLabel(openDailyCashSessionForForm),
  }] : [], [openDailyCashSessionForForm])

  useEffect(() => {
    if (form.shiftId || !formShiftOptions.length) return
    setForm((current) => ({ ...current, shiftId: formShiftOptions[0].value }))
  }, [form.shiftId, formShiftOptions])

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
    { key: 'shiftName', label: 'Caja', render: (row) => row.shiftName || 'Sin caja' },
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
    { key: 'shiftName', label: 'Caja', render: (row) => row.shiftName || (row.closureType === 'legacy' ? 'Legacy/Sin caja' : '-') },
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


  async function openCashSession() {
    if (!canClose) {
      feedback.warning('No tenés permiso para abrir cajas del día.')
      return
    }

    setSaving(true)
    try {
      const now = new Date()
      const startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const date = cash.dateFrom || form.date || todayISO()
      const session = await repository.ensureDailyCashSession({
        date,
        startTime,
        openedBy: userOperationId(user),
        openedByName: userOperationName(user),
        notes: 'Caja diaria compartida abierta desde Caja diaria.',
      })
      setCreatedCashSession(session)
      shifts.refresh?.()
      setForm((current) => ({ ...current, date, shiftId: session.id }))
      setShiftFilter(session.id)
      if (session.status === 'Cerrado') {
        feedback.warning('La caja del día ya existe pero está cerrada. No se pueden registrar movimientos nuevos.')
      } else {
        feedback.success(session.created ? 'Caja del día abierta.' : 'Caja del día ya estaba abierta. Se reutiliza la misma caja compartida.')
      }
    } catch (error) {
      feedback.error(error?.message || 'No se pudo abrir la caja del día.')
    } finally {
      setSaving(false)
    }
  }

  async function saveMovement(event) {
    event.preventDefault()
    if (!canWrite) {
      feedback.warning('No tenes permiso para crear movimientos de caja.')
      return
    }
    const movementShift = findOpenDailyCashSession(visibleCashSessions, form.date)
    if (!movementShift) {
      feedback.warning('No hay caja del día abierta. Abrí la caja diaria para poder registrar movimientos.')
      return
    }
    setSaving(true)
    try {
      if (movementShift.status === 'Cerrado') {
        feedback.warning('No se puede operar sobre una caja cerrada.')
        return
      }
      await repository.createCashMovementTransaction({
        ...form,
        shiftId: movementShift.id,
        amount: numberValue(form.amount),
        shiftName: 'Caja del día',
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
    const closeShift = dailyCashSession
    if (!closeShift) {
      feedback.warning('No hay caja del día para cerrar en la fecha seleccionada.')
      return
    }
    const ok = await feedback.confirm({
      title: 'Cerrar caja del día',
      message: 'El cierre será inmutable. Todos los movimientos abiertos de la caja diaria compartida quedarán vinculados a este cierre único y la caja pasará a Cerrado.',
      confirmText: 'Cerrar caja del día',
      tone: 'warning',
    })
    if (!ok) return
    setSaving(true)
    try {
      if (closeShift.status === 'Cerrado') {
        feedback.warning('Esa caja ya está cerrada.')
        return
      }
      await repository.closeCashTransaction({
        date: closeShift.date || cash.dateFrom || todayISO(),
        shiftId: closeShift.id,
        shiftName: 'Caja del día',
        shiftDate: closeShift.date || cash.dateFrom || todayISO(),
        ...shiftUserPayload(closeShift),
      })
      feedback.success('La caja del día se cerró correctamente con auditoría.')
      cash.refresh?.()
      closures.refresh?.()
      shifts.refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo cerrar la caja.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Administracion"
        title="Caja diaria"
        description="Movimientos, ventas cobradas, egresos y cierre de la caja diaria compartida. Cada venta y movimiento conserva el usuario que lo registró."
        actions={
          <>
            <ExportButtons
              title="Movimientos de caja"
              subtitle="Movimientos filtrados con caja, tipo, método, importe, estado y cierre."
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
            {canClose && <button className="btn" onClick={openCashSession} disabled={saving}>{saving ? 'Procesando...' : 'Abrir caja del día'}</button>}
            {canClose && <button className="btn" onClick={closeCash} disabled={saving || !dailyCashSession || dailyCashSession.status === 'Cerrado'}>{saving ? 'Procesando...' : 'Cerrar caja del día'}</button>}
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
              <span>Caja</span>
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
            <h2>Cierres de caja diaria</h2>
            <ExportButtons
              title="Cierres de caja diaria"
              subtitle="Historial del cierre único de caja diaria compartida, con ingresos, egresos, neto y movimientos incluidos."
              rows={closures.items}
              columns={closureColumns}
              summary={[{ label: 'Cierres de caja diaria', value: closures.items.length }]}
              fileLabel="cierres-caja-diaria"
            />
          </div>
          <DataTable
            rows={closures.items}
            columns={closureColumns}
            actions={(row) => <IndividualExportActions row={row} columns={closureColumns} title="Cierre de caja" fileLabel="cierre-caja" />}
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
                { name: 'type', label: 'Tipo', type: 'select', options: ['Ingreso', 'Egreso'] },
                { name: 'concept', label: 'Concepto', required: true },
                { name: 'method', label: 'Metodo', type: 'select', options: ['Efectivo', 'Transferencia', 'Debito', 'Credito', 'Otro'] },
                { name: 'amount', label: 'Importe', type: 'number' },
              ]}
            />
            {!openDailyCashSessionForForm && (
              <div className="system-card system-card-warning compact-card">
                <strong>No hay caja del día abierta.</strong> Abrí la caja diaria para poder registrar movimientos.
                {canClose && (
                  <button className="btn btn-small" type="button" onClick={openCashSession} disabled={saving}>
                    Abrir caja del día
                  </button>
                )}
              </div>
            )}
          </form>
        </Modal>
      )}
    </section>
  )
}
