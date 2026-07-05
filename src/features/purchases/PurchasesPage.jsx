import React, { useEffect, useId, useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { ListToolbar } from '../../components/ui/ListToolbar.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { useServerCollectionControls } from '../../hooks/useServerCollectionControls.js'
import { useCollection } from '../../hooks/useCollection.js'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, numberValue, sumBy, todayISO } from '../../utils/formatters.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { findOpenDailyCashSession, shiftOptionLabel, shiftUserPayload } from '../../utils/shifts.js'

const initialForm = {
  date: todayISO(),
  supplierId: '',
  productId: '',
  qty: 1,
  cost: 0,
  paid: true,
  paymentMethod: 'Efectivo',
  shiftId: '',
  invoice: '',
  notes: '',
}

export function PurchasesPage() {
  const purchases = useServerCollectionControls('purchases', { dateField: 'date', statusField: 'status', orderByField: 'date', orderDirection: 'desc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const { supplierOptions, productOptions, supplierMap, productMap, supplierById, productById, products } = useLookups()
  const [modalOpen, setModalOpen] = useState(false)
  const [voidingPurchase, setVoidingPurchase] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const purchaseFormId = useId()
  const voidFormId = useId()
  const feedback = useFeedback()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('compras.write')

  const selectedProduct = useMemo(() => products.find((item) => item.id === form.productId), [products, form.productId])
  const total = numberValue(form.qty) * numberValue(form.cost)
  const activePurchases = purchases.items.filter((item) => item.status !== 'Anulada')
  const totalActive = sumBy(activePurchases, (item) => item.total || numberValue(item.qty) * numberValue(item.cost))
  const selectedShift = useMemo(() => findOpenDailyCashSession(shifts.items, form.date), [form.date, shifts.items])
  const openShiftOptions = useMemo(() => selectedShift ? [{
    value: selectedShift.id,
    label: shiftOptionLabel(selectedShift),
  }] : [], [selectedShift])

  useEffect(() => {
    if (!form.paid || form.shiftId || !openShiftOptions.length) return
    setForm((current) => ({ ...current, shiftId: openShiftOptions[0].value }))
  }, [form.paid, form.shiftId, openShiftOptions])

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'supplierId', label: 'Proveedor', render: (row) => supplierMap[row.supplierId] || row.supplierName || '-' },
    { key: 'productId', label: 'Producto', render: (row) => productMap[row.productId] || row.productName || '-' },
    { key: 'qty', label: 'Cantidad' },
    { key: 'cost', label: 'Costo unit.', render: (row) => money(row.cost) },
    { key: 'total', label: 'Total', render: (row) => money(row.total || numberValue(row.qty) * numberValue(row.cost)) },
    { key: 'paid', label: 'Pago', render: (row) => row.paid ? 'Pagado' : 'Pendiente' },
    { key: 'status', label: 'Estado', render: (row) => row.status || 'Activa' },
    { key: 'invoice', label: 'Comprobante' },
  ]

  const exportColumns = [
    ...columns,
    { key: 'cashMovementId', label: 'Mov. caja' },
    { key: 'stockMovementId', label: 'Mov. stock' },
    { key: 'voidReason', label: 'Motivo anulación' },
    { key: 'notes', label: 'Notas' },
  ]

  function handleChange(name, value) {
    setForm((current) => ({ ...current, [name]: value, ...(name === 'date' ? { shiftId: '' } : {}) }))
  }

  async function savePurchase(event) {
    event.preventDefault()
    if (!canWrite) {
      feedback.warning('No tenés permiso para crear compras.')
      return
    }
    if (!selectedProduct) return
    if (form.paid && !selectedShift) {
      feedback.warning('No hay caja del día abierta. Abrí la caja diaria para registrar el egreso de la compra pagada.')
      return
    }
    setSaving(true)
    try {
      await repository.createPurchaseTransaction({
        ...form,
        qty: numberValue(form.qty) || 1,
        cost: numberValue(form.cost),
        supplierName: supplierMap[form.supplierId] || '',
        supplierPhone: supplierById[form.supplierId]?.phone || '',
        productName: productMap[form.productId] || selectedProduct?.name || '',
        productSku: productById[form.productId]?.sku || selectedProduct?.sku || '',
        ...(selectedShift ? {
          shiftId: selectedShift.id,
          shiftName: 'Caja del día',
          shiftDate: selectedShift.date || form.date,
          ...shiftUserPayload(selectedShift),
        } : {}),
      })
      feedback.success('La compra se registró con reposición de stock, caja y auditoría.')
      purchases.refresh?.()
      setModalOpen(false)
      setForm(initialForm)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la compra.')
    } finally {
      setSaving(false)
    }
  }

  function openVoid(row) {
    setVoidingPurchase(row)
    setVoidReason('')
  }

  async function confirmVoid(event) {
    event.preventDefault()
    if (!canWrite || !voidingPurchase) return
    if (!voidReason.trim()) {
      feedback.warning('Indicá un motivo de anulación.')
      return
    }
    setSaving(true)
    try {
      await repository.voidPurchaseTransaction(voidingPurchase, { reason: voidReason.trim(), date: todayISO() })
      feedback.success('La compra fue anulada y se revirtió stock/caja cuando correspondía.')
      purchases.refresh?.()
      setVoidingPurchase(null)
      setVoidReason('')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo anular la compra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Compras"
        title="Compras"
        description="Compras transaccionales: reposición de stock, egreso en la caja abierta si está pagada y auditoría automática."
        actions={
          <>
            <ExportButtons
              title="Compras"
              subtitle="Compras filtradas con proveedor, producto, stock, caja y estado."
              rows={purchases.items}
              getRows={purchases.fetchAllForExport}
              columns={exportColumns}
              summary={[
                { label: 'Compras activas', value: activePurchases.length },
                { label: 'Total activo', value: money(totalActive) },
              ]}
              fileLabel="compras"
            />
            {canWrite && <button className="btn btn-primary" onClick={() => setModalOpen(true)}>Nueva compra</button>}
          </>
        }
      />

      <div className="stats-grid compact">
        <StatCard label="Compras activas" value={activePurchases.length} />
        <StatCard label="Total activo" value={money(totalActive)} tone="warning" />
        <StatCard label="Compras anuladas" value={purchases.items.filter((item) => item.status === 'Anulada').length} tone="danger" />
      </div>

      <ListToolbar
        query={purchases.query}
        onQueryChange={purchases.setQuery}
        placeholder="Buscar por proveedor, producto, SKU, comprobante, estado o notas..."
        dateFrom={purchases.dateFrom}
        dateTo={purchases.dateTo}
        onDateFromChange={purchases.setDateFrom}
        onDateToChange={purchases.setDateTo}
        status={purchases.status}
        onStatusChange={purchases.setStatus}
        statusOptions={['Activa', 'Anulada']}
        onClearFilters={purchases.clearFilters}
      />
      <DataTable
        rows={purchases.items}
        columns={columns}
        actions={(row) => (
          <>
            {canWrite && row.status !== 'Anulada' && <button className="btn btn-small btn-danger" onClick={() => openVoid(row)}>Anular</button>}
          </>
        )}
      />
      <Pagination {...purchases} onPageSizeChange={purchases.setPageSize} total={purchases.items.length} limit={purchases.pageSize} />

      {modalOpen && (
        <Modal
          title="Nueva compra"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <strong className="modal-total">Total: {money(total)}</strong>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={purchaseFormId} disabled={saving || !selectedProduct}>
                {saving ? 'Guardando...' : 'Guardar compra'}
              </button>
            </>
          }
        >
          <form id={purchaseFormId} onSubmit={savePurchase}>
            <FormGrid
              value={form}
              onChange={handleChange}
              fields={[
                { name: 'date', label: 'Fecha', type: 'date', required: true },
                { name: 'supplierId', label: 'Proveedor', type: 'select', options: supplierOptions, required: true },
                { name: 'productId', label: 'Producto físico', type: 'select', options: productOptions, required: true },
                { name: 'qty', label: 'Cantidad', type: 'number' },
                { name: 'cost', label: 'Costo unitario', type: 'number' },
                { name: 'paid', label: 'Pagado', type: 'checkbox' },
                { name: 'paymentMethod', label: 'Método de pago', type: 'select', options: ['Efectivo', 'Transferencia', 'Debito', 'Credito', 'Otro'] },
                { name: 'invoice', label: 'Factura / remito' },
                { name: 'notes', label: 'Notas', type: 'textarea' },
              ]}
            />
            {form.paid && !selectedShift && (
              <div className="system-card system-card-warning compact-card">
                <strong>No hay caja del día abierta.</strong> Abrí la caja diaria para registrar esta compra pagada.
              </div>
            )}
            {selectedProduct && <div className="preview-box">Stock actual: {selectedProduct.stock} · Nuevo stock estimado: {numberValue(selectedProduct.stock) + numberValue(form.qty)}</div>}
          </form>
        </Modal>
      )}

      {voidingPurchase && (
        <Modal
          title="Anular compra"
          onClose={() => setVoidingPurchase(null)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setVoidingPurchase(null)}>Cancelar</button>
              <button className="btn btn-danger-solid" type="submit" form={voidFormId} disabled={saving}>
                {saving ? 'Anulando...' : 'Anular compra'}
              </button>
            </>
          }
        >
          <form id={voidFormId} onSubmit={confirmVoid}>
            <div className="system-card system-card-warning compact-card">
              Se descontará del stock la cantidad comprada y se anulará el egreso de caja si todavía no fue cerrado.
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
