import React, { useEffect, useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, numberValue, sumBy, todayISO } from '../../utils/formatters.js'
import {
  CREDIT_SURCHARGE_OPTIONS,
  DEFAULT_CREDIT_SURCHARGE_PERCENT,
  calculateSalePricing,
  isCreditPaymentMethod,
  paymentLabelWithSurcharge,
} from '../../utils/salesPricing.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { filterOpenShiftsForUser, isUserAssignedToShift, shiftOptionLabel, shiftUserPayload } from '../../utils/shifts.js'

const paymentMethods = ['Efectivo', 'Transferencia', 'Debito', 'Credito', 'Cuenta corriente']
const qtyPresets = [1, 2, 3, 5]

const initialForm = {
  date: todayISO(),
  shiftId: '',
  clientId: '',
  patientId: '',
  paymentMethod: 'Efectivo',
  creditSurchargePercent: DEFAULT_CREDIT_SURCHARGE_PERCENT,
  paid: true,
  dueDate: '',
  notes: '',
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function productMatches(product, query) {
  const normalizedQuery = normalizeText(query)
  if (!normalizedQuery) return true
  return normalizeText(`${product.name || ''} ${product.sku || ''} ${product.category || ''} ${product.type || ''}`).includes(normalizedQuery)
}

function stockLabel(product) {
  if (product.type !== 'Producto') return 'Servicio'
  const stock = numberValue(product.stock)
  if (stock <= 0) return 'Sin stock'
  if (stock <= numberValue(product.minStock)) return `Stock bajo: ${stock}`
  return `Stock: ${stock}`
}

export function QuickSalePage() {
  const feedback = useFeedback()
  const { hasPermission, user } = useAuth()
  const canWrite = hasPermission('ventas.write')
  const isAdmin = user?.role === 'admin'

  const { clientOptions, patientOptions, clientMap, patientMap } = useLookups()
  const products = useCollection('products', { limitCount: 300, orderByField: 'name', orderDirection: 'asc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const sales = useCollection('sales', {
    where: [{ field: 'date', op: '==', value: todayISO() }],
    limitCount: 80,
    orderByField: 'date',
    orderDirection: 'desc',
  })

  const [form, setForm] = useState(initialForm)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todos')
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving] = useState(false)

  const openShiftOptions = useMemo(() => filterOpenShiftsForUser(shifts.items, user, form.date)
    .map((item) => ({
      value: item.id,
      label: shiftOptionLabel(item),
    })), [form.date, shifts.items, user])

  useEffect(() => {
    if (form.shiftId || !openShiftOptions.length) return
    setForm((current) => ({ ...current, shiftId: openShiftOptions[0].value }))
  }, [form.shiftId, openShiftOptions])

  const selectedShift = useMemo(
    () => shifts.items.find((item) => item.id === form.shiftId),
    [form.shiftId, shifts.items],
  )

  const activeProducts = useMemo(() => products.items.filter((item) => item.active !== false), [products.items])
  const categories = useMemo(() => ['Todos', ...Array.from(new Set(activeProducts.map((item) => item.category || 'Sin categoria'))).sort()], [activeProducts])
  const filteredProducts = useMemo(() => activeProducts
    .filter((item) => category === 'Todos' || (item.category || 'Sin categoria') === category)
    .filter((item) => productMatches(item, query))
    .slice(0, 60), [activeProducts, category, query])

  const selectedProduct = useMemo(
    () => activeProducts.find((item) => item.id === selectedProductId) || null,
    [activeProducts, selectedProductId],
  )

  const forcedCurrentAccount = form.paymentMethod === 'Cuenta corriente'
  const forcedCreditSurcharge = isCreditPaymentMethod(form.paymentMethod)
  const normalizedQty = Math.max(1, numberValue(qty) || 1)
  const previewSubtotal = normalizedQty * numberValue(selectedProduct?.price)
  const salePricing = calculateSalePricing({
    subtotal: previewSubtotal,
    paymentMethod: form.paymentMethod,
    creditSurchargePercent: form.creditSurchargePercent,
  })
  const previewTotal = salePricing.total
  const todayActiveSales = sales.items.filter((item) => item.status !== 'Anulada')
  const todayPaid = todayActiveSales.filter((item) => item.paid)
  const todayPending = todayActiveSales.filter((item) => !item.paid)
  const recentColumns = [
    { key: 'shiftName', label: 'Turno', render: (row) => row.shiftName || 'Sin turno' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || row.clientName || 'Mostrador' },
    { key: 'items', label: 'Detalle', render: (row) => row.items?.map((item) => `${item.name} x${item.qty}`).join(', ') || '-' },
    { key: 'paymentMethod', label: 'Pago', render: (row) => paymentLabelWithSurcharge(row.paymentMethod, row.creditSurchargePercent) },
    { key: 'total', label: 'Total', render: (row) => money(row.total) },
  ]

  function updateForm(name, value) {
    setForm((current) => {
      const normalizedValue = name === 'creditSurchargePercent' && typeof value === 'string'
        ? value.replace(',', '.')
        : value
      const next = {
        ...current,
        [name]: normalizedValue,
        ...(name === 'date' ? { shiftId: '' } : {}),
        ...(name === 'paymentMethod' && value === 'Cuenta corriente' ? { paid: false } : {}),
      }
      if (name === 'paymentMethod' && isCreditPaymentMethod(value)) {
        next.creditSurchargePercent = current.creditSurchargePercent || DEFAULT_CREDIT_SURCHARGE_PERCENT
        next.paid = true
      }
      return next
    })
  }

  function selectProduct(product) {
    if (product.type === 'Producto' && numberValue(product.stock) <= 0) {
      feedback.warning('Ese producto no tiene stock disponible.')
      return
    }
    setSelectedProductId(product.id)
  }

  function changeQty(nextQty) {
    setQty(Math.max(1, numberValue(nextQty) || 1))
  }

  async function saveQuickSale(event) {
    event.preventDefault()
    if (!canWrite) {
      feedback.warning('No tenes permiso para crear ventas.')
      return
    }
    if (!selectedProduct) {
      feedback.warning('Selecciona un producto o servicio.')
      return
    }
    if (!form.shiftId) {
      feedback.warning('Seleccioná un turno de caja abierto para registrar la venta.')
      setShowDetails(true)
      return
    }
    if (!selectedShift) {
      feedback.warning('El turno de caja seleccionado ya no está disponible.')
      setShowDetails(true)
      return
    }
    if (selectedShift.status === 'Cerrado') {
      feedback.warning('No se puede registrar una venta en un turno cerrado.')
      setShowDetails(true)
      return
    }
    if (!isAdmin && !isUserAssignedToShift(selectedShift, user)) {
      feedback.warning('Tu usuario no está asignado al turno de caja seleccionado.')
      setShowDetails(true)
      return
    }
    if (forcedCurrentAccount && !form.clientId) {
      feedback.warning('Para cuenta corriente tenes que seleccionar un cliente.')
      setShowDetails(true)
      return
    }

    setSaving(true)
    try {
      await repository.createSaleTransaction({
        ...form,
        productId: selectedProduct.id,
        qty: normalizedQty,
        creditSurchargePercent: salePricing.creditSurchargePercent,
        paid: forcedCurrentAccount ? false : Boolean(form.paid),
        shiftName: selectedShift.name || '',
        shiftDate: selectedShift.date || form.date,
        ...shiftUserPayload(selectedShift),
        clientName: clientMap[form.clientId] || '',
        patientName: patientMap[form.patientId] || '',
      })
      feedback.success(`Venta registrada: ${selectedProduct.name} x${normalizedQty} - ${money(previewTotal)}.`)
      sales.refresh?.()
      products.refresh?.()
      setSelectedProductId('')
      setQty(1)
      setQuery('')
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

  return (
    <section className="quick-sale-page">
      <SectionHeader
        eyebrow="Mostrador"
        title="Venta rápida"
        description="Carga táctil para momentos de mucha clientela: elegís producto, cantidad, método de pago y guardás sin pasar por una grilla larga. Usa la misma transacción de ventas, stock, caja, cuenta corriente y auditoría."
      />

      <div className="quick-sale-stats stats-grid compact">
        <StatCard label="Cobrado hoy" value={money(sumBy(todayPaid, (item) => item.total))} tone="success" />
        <StatCard label="Pendiente" value={money(sumBy(todayPending, (item) => item.total))} tone="warning" />
        <StatCard label="Ventas hoy" value={todayActiveSales.length} />
      </div>

      <form className="quick-sale-layout" onSubmit={saveQuickSale}>
        <div className="quick-sale-main">
          <div className="panel quick-sale-toolbar">
            <label className="field quick-search-field">
              <span>Buscar producto o servicio</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ej: vacuna, alimento, consulta..."
                inputMode="search"
              />
            </label>
            <div className="quick-category-strip" aria-label="Categorías">
              {categories.map((item) => (
                <button
                  className={`quick-chip ${category === item ? 'active' : ''}`}
                  type="button"
                  key={item}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-product-grid" aria-label="Productos disponibles">
            {filteredProducts.map((product) => {
              const selected = product.id === selectedProductId
              const withoutStock = product.type === 'Producto' && numberValue(product.stock) <= 0
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`quick-product-card ${selected ? 'selected' : ''} ${withoutStock ? 'disabled' : ''}`}
                  onClick={() => selectProduct(product)}
                  disabled={withoutStock}
                >
                  <span className="quick-product-type">{product.category || product.type || 'Producto'}</span>
                  <strong>{product.name}</strong>
                  <span className="quick-product-price">{money(product.price)}</span>
                  <small>{stockLabel(product)}</small>
                </button>
              )
            })}
            {!filteredProducts.length && (
              <div className="panel quick-empty-state">
                No hay productos activos que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

        <aside className="panel quick-sale-ticket">
          <div className="quick-ticket-header">
            <span>Venta actual</span>
            <strong>{selectedProduct ? selectedProduct.name : 'Sin producto'}</strong>
          </div>

          <div className="quick-total-box">
            <span>Total</span>
            <strong>{money(previewTotal)}</strong>
            {selectedProduct && !forcedCreditSurcharge && <small>{money(selectedProduct.price)} x {normalizedQty}</small>}
            {selectedProduct && forcedCreditSurcharge && (
              <small>
                Subtotal {money(salePricing.subtotal)} + {salePricing.creditSurchargePercent}% tarjeta ({money(salePricing.creditSurchargeAmount)})
              </small>
            )}
          </div>

          <div className="quick-qty-panel">
            <span>Cantidad</span>
            <div className="quick-stepper">
              <button type="button" onClick={() => changeQty(normalizedQty - 1)}>-</button>
              <input value={qty} onChange={(event) => changeQty(event.target.value)} type="number" min="1" inputMode="numeric" />
              <button type="button" onClick={() => changeQty(normalizedQty + 1)}>+</button>
            </div>
            <div className="quick-qty-presets">
              {qtyPresets.map((item) => (
                <button className={normalizedQty === item ? 'active' : ''} type="button" key={item} onClick={() => changeQty(item)}>
                  x{item}
                </button>
              ))}
            </div>
          </div>

          <div className="quick-payment-panel">
            <span>Método de pago</span>
            <div className="quick-payment-grid">
              {paymentMethods.map((method) => (
                <button
                  type="button"
                  key={method}
                  className={form.paymentMethod === method ? 'active' : ''}
                  onClick={() => updateForm('paymentMethod', method)}
                >
                  {method}
                </button>
              ))}
            </div>

            {forcedCreditSurcharge && (
              <div className="quick-credit-surcharge-panel">
                <span>Recargo tarjeta de crédito</span>
                <label className="field quick-credit-custom-field">
                  <span>Porcentaje personalizado</span>
                  <div className="quick-percent-input-wrap">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      inputMode="decimal"
                      value={form.creditSurchargePercent}
                      onChange={(event) => updateForm('creditSurchargePercent', event.target.value)}
                      placeholder="15"
                    />
                    <strong>%</strong>
                  </div>
                </label>
                <div className="quick-credit-surcharge-grid" aria-label="Recargos rápidos">
                  {CREDIT_SURCHARGE_OPTIONS.map((percent) => (
                    <button
                      className={Number(form.creditSurchargePercent) === percent ? 'active' : ''}
                      type="button"
                      key={percent}
                      onClick={() => updateForm('creditSurchargePercent', percent)}
                    >
                      {percent}%
                    </button>
                  ))}
                </div>
                <small>Al elegir Crédito se carga 15% por defecto. Podés escribir otro porcentaje, incluso con decimales, antes de guardar.</small>
              </div>
            )}
          </div>

          <button className="quick-details-toggle" type="button" onClick={() => setShowDetails((value) => !value)}>
            {showDetails ? 'Ocultar datos opcionales' : 'Cliente, paciente, turno de caja y notas'}
          </button>

          {showDetails && (
            <div className="quick-extra-fields">
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
              </label>
              <label className="field">
                <span>Turno de caja abierto</span>
                <select value={form.shiftId} onChange={(event) => updateForm('shiftId', event.target.value)} required>
                  <option value="">Seleccionar turno</option>
                  {openShiftOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Cliente</span>
                <select value={form.clientId} onChange={(event) => updateForm('clientId', event.target.value)} required={forcedCurrentAccount}>
                  <option value="">Mostrador / sin cliente</option>
                  {clientOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Paciente</span>
                <select value={form.patientId} onChange={(event) => updateForm('patientId', event.target.value)}>
                  <option value="">Sin paciente</option>
                  {patientOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              {forcedCurrentAccount && (
                <label className="field">
                  <span>Vencimiento</span>
                  <input type="date" value={form.dueDate} onChange={(event) => updateForm('dueDate', event.target.value)} />
                </label>
              )}
              <label className="field field-textarea">
                <span>Notas</span>
                <textarea rows="3" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Observaciones internas..." />
              </label>
            </div>
          )}

          <button className="btn btn-primary quick-save-button" type="submit" disabled={saving || !selectedProduct || !canWrite}>
            {saving ? 'Guardando...' : 'Guardar venta'}
          </button>
        </aside>
      </form>

      <article className="panel quick-recent-panel">
        <div className="panel-title-row">
          <h2>Últimas ventas de hoy</h2>
          <span className="muted">{dateLabel(todayISO())}</span>
        </div>
        <DataTable rows={sales.items.slice(0, 8)} columns={recentColumns} />
      </article>
    </section>
  )
}
