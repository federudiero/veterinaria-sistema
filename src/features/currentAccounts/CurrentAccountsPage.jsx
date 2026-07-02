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
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, numberValue, sumBy, todayISO } from '../../utils/formatters.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'

const paymentInitial = { date: todayISO(), shiftId: '', amount: 0, method: 'Efectivo' }

function pendingAmount(row) {
  return Math.max(0, numberValue(row.amount) - numberValue(row.paidAmount))
}

export function CurrentAccountsPage() {
  const accounts = useServerCollectionControls('currentAccounts', { dateField: 'date', statusField: 'status', orderByField: 'date', orderDirection: 'desc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const { clientOptions, clientMap, clientById } = useLookups()
  const [paymentRow, setPaymentRow] = useState(null)
  const [paymentForm, setPaymentForm] = useState(paymentInitial)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm, setManualForm] = useState({ date: todayISO(), dueDate: '', clientId: '', type: 'Deuda', concept: '', amount: 0, paidAmount: 0, status: 'Pendiente', notes: '' })
  const [saving, setSaving] = useState(false)
  const paymentFormId = useId()
  const manualFormId = useId()
  const feedback = useFeedback()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('caja.write')

  const activeRows = accounts.items.filter((item) => item.status !== 'Anulado')
  const pendingRows = activeRows.filter((item) => pendingAmount(item) > 0 && item.status !== 'Cancelado')
  const totalPending = sumBy(pendingRows, pendingAmount)
  const totalAmount = sumBy(activeRows, (item) => item.amount)
  const totalPaid = sumBy(activeRows, (item) => item.paidAmount)

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'dueDate', label: 'Vence', render: (row) => dateLabel(row.dueDate) },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'concept', label: 'Concepto' },
    { key: 'amount', label: 'Importe', render: (row) => money(row.amount) },
    { key: 'paidAmount', label: 'Pagado', render: (row) => money(row.paidAmount) },
    { key: 'pending', label: 'Saldo', render: (row) => money(pendingAmount(row)) },
    { key: 'status', label: 'Estado' },
  ]

  const exportColumns = [
    ...columns,
    { key: 'type', label: 'Tipo' },
    { key: 'relatedSaleId', label: 'Venta vinculada' },
    { key: 'clientPhone', label: 'Teléfono cliente', exportValue: (row) => clientById[row.clientId]?.phone || '-' },
    { key: 'clientEmail', label: 'Email cliente', exportValue: (row) => clientById[row.clientId]?.email || '-' },
    { key: 'clientDni', label: 'DNI / CUIT cliente', exportValue: (row) => clientById[row.clientId]?.dni || '-' },
    { key: 'clientAddress', label: 'Dirección cliente', exportValue: (row) => clientById[row.clientId]?.address || '-' },
    { key: 'notes', label: 'Notas' },
  ]

  const currentPaymentBalance = useMemo(() => paymentRow ? pendingAmount(paymentRow) : 0, [paymentRow])
  const paymentShiftOptions = useMemo(() => shifts.items
    .filter((item) => item.date === paymentForm.date && item.status !== 'Cerrado')
    .map((item) => ({
      value: item.id,
      label: `${item.name || 'Sin nombre'} ${item.startTime || ''}-${item.endTime || ''}`,
    })), [paymentForm.date, shifts.items])

  function openPayment(row) {
    setPaymentRow(row)
    setPaymentForm({ ...paymentInitial, amount: pendingAmount(row) })
  }

  function handlePaymentChange(name, value) {
    setPaymentForm((current) => ({ ...current, [name]: value }))
  }

  function handleManualChange(name, value) {
    setManualForm((current) => ({ ...current, [name]: value }))
  }

  async function savePayment(event) {
    event.preventDefault()
    if (!canWrite || !paymentRow) return
    const paymentShift = shifts.items.find((item) => item.id === paymentForm.shiftId)
    if (!paymentShift) {
      feedback.warning('Selecciona un turno abierto para registrar el pago.')
      return
    }
    setSaving(true)
    try {
      await repository.collectCurrentAccountTransaction(paymentRow, {
        date: paymentForm.date,
        shiftId: paymentShift.id,
        shiftName: paymentShift.name || '',
        shiftDate: paymentShift.date || paymentForm.date,
        veterinarianIds: paymentShift.veterinarianIds || [],
        veterinarianNames: paymentShift.veterinarianNames || [],
        amount: numberValue(paymentForm.amount),
        method: paymentForm.method,
      })
      feedback.success('El pago fue registrado en cuenta corriente, caja y auditoría.')
      accounts.refresh?.()
      setPaymentRow(null)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo registrar el pago.')
    } finally {
      setSaving(false)
    }
  }

  async function saveManual(event) {
    event.preventDefault()
    if (!canWrite) return
    setSaving(true)
    try {
      const amount = numberValue(manualForm.amount)
      const paidAmount = numberValue(manualForm.paidAmount)
      const manualClient = clientById[manualForm.clientId]
      await accounts.create({
        ...manualForm,
        clientName: clientMap[manualForm.clientId] || manualClient?.name || '',
        clientPhone: manualClient?.phone || '',
        clientEmail: manualClient?.email || '',
        amount,
        paidAmount,
        status: paidAmount >= amount ? 'Cancelado' : paidAmount > 0 ? 'Parcial' : manualForm.status,
      })
      feedback.success('El movimiento manual de cuenta corriente fue creado con auditoría.')
      accounts.refresh?.()
      setManualOpen(false)
      setManualForm({ date: todayISO(), dueDate: '', clientId: '', type: 'Deuda', concept: '', amount: 0, paidAmount: 0, status: 'Pendiente', notes: '' })
    } catch (error) {
      feedback.error(error?.message || 'No se pudo crear el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Administración"
        title="Cuentas corrientes"
        description="Deudas, pagos parciales y cancelaciones vinculadas a caja y ventas. Los pagos se registran de forma transaccional."
        actions={
          <>
            <ExportButtons
              title="Cuentas corrientes"
              subtitle="Movimientos filtrados con saldo, vencimiento, venta vinculada y datos completos del contacto."
              rows={accounts.items}
              getRows={accounts.fetchAllForExport}
              columns={exportColumns}
              summary={[
                { label: 'Total deuda activa', value: money(totalAmount) },
                { label: 'Total cobrado', value: money(totalPaid) },
                { label: 'Saldo pendiente en página', value: money(totalPending) },
              ]}
              fileLabel="cuentas-corrientes"
            />
            {canWrite && <button className="btn btn-primary" onClick={() => setManualOpen(true)}>Movimiento manual</button>}
          </>
        }
      />

      <div className="stats-grid compact">
        <StatCard label="Saldo pendiente" value={money(totalPending)} tone="warning" />
        <StatCard label="Total cobrado" value={money(totalPaid)} tone="success" />
        <StatCard label="Clientes con deuda" value={new Set(pendingRows.map((item) => item.clientId)).size} />
      </div>

      <ListToolbar
        query={accounts.query}
        onQueryChange={accounts.setQuery}
        placeholder="Buscar por cliente, teléfono, concepto, estado, venta vinculada o fecha..."
        dateFrom={accounts.dateFrom}
        dateTo={accounts.dateTo}
        onDateFromChange={accounts.setDateFrom}
        onDateToChange={accounts.setDateTo}
        status={accounts.status}
        onStatusChange={accounts.setStatus}
        statusOptions={['Pendiente', 'Parcial', 'Cancelado', 'Vencido', 'Anulado']}
        onClearFilters={accounts.clearFilters}
      />
      <DataTable
        rows={accounts.items}
        columns={columns}
        actions={(row) => (
          <>
            <IndividualExportActions row={row} columns={exportColumns} title="Cuenta corriente" fileLabel="cuenta-corriente" />
            {canWrite && row.status !== 'Anulado' && pendingAmount(row) > 0 && <button className="btn btn-small" onClick={() => openPayment(row)}>Cobrar</button>}
          </>
        )}
      />
      <Pagination {...accounts} onPageSizeChange={accounts.setPageSize} total={accounts.items.length} limit={accounts.pageSize} />

      {paymentRow && (
        <Modal
          title="Registrar pago"
          onClose={() => setPaymentRow(null)}
          footer={
            <>
              <strong className="modal-total">Saldo: {money(currentPaymentBalance)}</strong>
              <button className="btn" type="button" onClick={() => setPaymentRow(null)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={paymentFormId} disabled={saving}>{saving ? 'Guardando...' : 'Registrar pago'}</button>
            </>
          }
        >
          <form id={paymentFormId} onSubmit={savePayment}>
            <FormGrid
              value={paymentForm}
              onChange={handlePaymentChange}
              fields={[
                { name: 'date', label: 'Fecha de pago', type: 'date', required: true },
                { name: 'shiftId', label: 'Turno activo', type: 'select', options: paymentShiftOptions, required: true, hint: paymentShiftOptions.length ? '' : 'No hay turnos abiertos para la fecha seleccionada.' },
                { name: 'amount', label: 'Importe a cobrar', type: 'number', required: true },
                { name: 'method', label: 'Método', type: 'select', options: ['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'Otro'] },
              ]}
            />
          </form>
        </Modal>
      )}

      {manualOpen && (
        <Modal
          title="Movimiento manual de cuenta corriente"
          onClose={() => setManualOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setManualOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={manualFormId} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
            </>
          }
        >
          <form id={manualFormId} onSubmit={saveManual}>
            <FormGrid
              value={manualForm}
              onChange={handleManualChange}
              fields={[
                { name: 'date', label: 'Fecha', type: 'date', required: true },
                { name: 'dueDate', label: 'Vencimiento', type: 'date' },
                { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true },
                { name: 'type', label: 'Tipo', type: 'select', options: ['Deuda', 'Pago', 'Ajuste'] },
                { name: 'concept', label: 'Concepto', required: true },
                { name: 'amount', label: 'Importe', type: 'number' },
                { name: 'paidAmount', label: 'Pagado inicial', type: 'number' },
                { name: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Parcial', 'Cancelado', 'Vencido'] },
                { name: 'notes', label: 'Notas', type: 'textarea' },
              ]}
            />
          </form>
        </Modal>
      )}
    </section>
  )
}
