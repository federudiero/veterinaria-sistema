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
import { findOpenDailyCashSession, shiftOptionLabel, shiftUserPayload, userOperationId, userOperationName } from '../../utils/shifts.js'

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
  const canManageCashSession = hasPermission('caja.close')
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
  const [createdCashSession, setCreatedCashSession] = useState(null)

  const visibleCashSessions = useMemo(() => [
    ...shifts.items,
    ...(createdCashSession ? [createdCashSession] : []),
  ].filter(Boolean), [createdCashSession, shifts.items])
  const openShiftOptions = useMemo(() => {
    const shift = findOpenDailyCashSession(visibleCashSessions, form.date)
    return shift ? [{ value: shift.id, label: shiftOptionLabel(shift) }] : []
  }, [form.date, visibleCashSessions])

  useEffect(() => {
    if (form.shiftId || !openShiftOptions.length) return
    setForm((current) => ({ ...current, shiftId: openShiftOptions[0].value }))
  }, [form.shiftId, openShiftOptions])

  const selectedShift = useMemo(
    () => visibleCashSessions.find((item) => item.id === form.shiftId) || null,
    [form.shiftId, visibleCashSessions],
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
    { key: 'shiftName', label: 'Caja', render: (row) => row.shiftName || 'Sin caja' },
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
        ...(name === 'paymentMethod' && value !== 'Cuenta corriente' ? { paid: true } : {}),
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
        notes: 'Caja diaria compartida abierta desde Venta rápida.',
      })
      setCreatedCashSession(session)
      shifts.refresh?.()
      setForm((current) => ({ ...current, shiftId: session.id }))
      if (session.status === 'Cerrado') {
        feedback.warning('La caja del día ya existe pero está cerrada. No se pueden registrar ventas nuevas.')
      } else {
        feedback.success(session.created ? 'Caja del día abierta. Ya podés registrar ventas.' : 'Caja del día ya estaba abierta. Se reutiliza la misma caja compartida.')
      }
    } catch (error) {
      feedback.error(error?.message || 'No se pudo abrir la caja del día.')
    } finally {
      setSaving(false)
    }
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
      feedback.warning('No hay caja del día abierta. Abrí la caja diaria para poder registrar ventas.')
      setShowDetails(true)
      return
    }
    if (!selectedShift) {
      feedback.warning('La caja seleccionada ya no está disponible.')
      setShowDetails(true)
      return
    }
    if (selectedShift.status === 'Cerrado') {
      feedback.warning('No se puede registrar una venta en una caja cerrada.')
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
        shiftName: 'Caja del día',
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
        description="Carga táctil para mostrador: elegís producto, cantidad y método de pago. La venta queda asociada automáticamente a la caja diaria compartida para sincronizar stock, caja, cuenta corriente y auditoría."
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
            {showDetails ? 'Ocultar datos opcionales' : 'Cliente, paciente y notas'}
          </button>

          {showDetails && (
            <div className="quick-extra-fields">
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} />
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
