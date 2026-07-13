import React, { useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { FuturePurchasesPage } from '../futurePurchases/FuturePurchasesPage.jsx'

const purchaseInitialForm = {
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

const productInitialForm = {
  sku: '',
  name: '',
  category: '',
  type: 'Producto',
  cost: 0,
  price: 0,
  stock: 0,
  minStock: 0,
  unit: 'unidad',
  active: true,
}

const supplierInitialForm = {
  name: '',
  cuit: '',
  phone: '',
  email: '',
  address: '',
  balance: 0,
  notes: '',
}

const INVENTORY_TABS = ['purchases', 'products', 'suppliers', 'future']

const MEGAVET_CATALOG_URL = `${import.meta.env.BASE_URL}catalogs/megavet-lista-2-julio-3.json`
const MEGAVET_CATALOG_SUMMARY = {
  total: 880,
  dogs: 545,
  cats: 335,
  zeroPrice: 1,
}

export function PurchasesPage() {
  const purchases = useServerCollectionControls('purchases', { dateField: 'date', statusField: 'status', orderByField: 'date', orderDirection: 'desc' })
  const productsPanel = useServerCollectionControls('products', { dateField: '', statusField: '', orderByField: 'name', orderDirection: 'asc' })
  const suppliersPanel = useServerCollectionControls('suppliers', { dateField: '', statusField: '', orderByField: 'name', orderDirection: 'asc' })
  const shifts = useCollection('shifts', { limitCount: 100, orderByField: 'date', orderDirection: 'desc' })
  const { supplierOptions, productOptions, supplierMap, productMap, supplierById, productById, products, refreshProducts } = useLookups()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') || ''
  const [activeTab, setActiveTabState] = useState(INVENTORY_TABS.includes(requestedTab) ? requestedTab : 'purchases')
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [supplierModalOpen, setSupplierModalOpen] = useState(false)
  const [catalogImportOpen, setCatalogImportOpen] = useState(false)
  const [catalogItems, setCatalogItems] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogImporting, setCatalogImporting] = useState(false)
  const [catalogImportProgress, setCatalogImportProgress] = useState({ processed: 0, total: MEGAVET_CATALOG_SUMMARY.total })
  const [catalogImportResult, setCatalogImportResult] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [voidingPurchase, setVoidingPurchase] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [purchaseForm, setPurchaseForm] = useState(purchaseInitialForm)
  const [productForm, setProductForm] = useState(productInitialForm)
  const [supplierForm, setSupplierForm] = useState(supplierInitialForm)
  const [saving, setSaving] = useState(false)
  const purchaseFormId = useId()
  const productFormId = useId()
  const supplierFormId = useId()
  const voidFormId = useId()
  const feedback = useFeedback()
  const { hasPermission } = useAuth()
  const canWritePurchases = hasPermission('compras.write')
  const canWriteStock = hasPermission('stock.write')

  function setActiveTab(tab) {
    const nextTab = INVENTORY_TABS.includes(tab) ? tab : 'purchases'
    setActiveTabState(nextTab)
    setSearchParams({ tab: nextTab })
  }

  const selectedProduct = useMemo(() => products.find((item) => item.id === purchaseForm.productId), [products, purchaseForm.productId])
  const purchaseTotal = numberValue(purchaseForm.qty) * numberValue(purchaseForm.cost)
  const activePurchases = purchases.items.filter((item) => item.status !== 'Anulada')
  const totalActive = sumBy(activePurchases, (item) => item.total || numberValue(item.qty) * numberValue(item.cost))
  const selectedShift = useMemo(() => findOpenDailyCashSession(shifts.items, purchaseForm.date), [purchaseForm.date, shifts.items])
  const openShiftOptions = useMemo(() => selectedShift ? [{ value: selectedShift.id, label: shiftOptionLabel(selectedShift) }] : [], [selectedShift])
  const lowStockProducts = productsPanel.items.filter((item) => item.type === 'Producto' && numberValue(item.stock) <= numberValue(item.minStock))

  useEffect(() => {
    if (!purchaseForm.paid || purchaseForm.shiftId || !openShiftOptions.length) return
    setPurchaseForm((current) => ({ ...current, shiftId: openShiftOptions[0].value }))
  }, [purchaseForm.paid, purchaseForm.shiftId, openShiftOptions])

  useEffect(() => {
    if (!requestedTab) return
    if (!INVENTORY_TABS.includes(requestedTab)) {
      setActiveTab('purchases')
      return
    }
    if (requestedTab !== activeTab) setActiveTabState(requestedTab)
  }, [requestedTab, activeTab])

  const purchaseColumns = [
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

  const productColumns = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Producto' },
    { key: 'category', label: 'Categoría' },
    { key: 'type', label: 'Tipo' },
    { key: 'stock', label: 'Stock' },
    { key: 'minStock', label: 'Mínimo' },
    { key: 'cost', label: 'Costo', render: (row) => money(row.cost) },
    { key: 'price', label: 'Precio', render: (row) => money(row.price) },
    { key: 'active', label: 'Activo', render: (row) => row.active === false ? 'No' : 'Sí' },
  ]

  const supplierColumns = [
    { key: 'name', label: 'Proveedor' },
    { key: 'cuit', label: 'CUIT' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Dirección' },
    { key: 'balance', label: 'Saldo', render: (row) => money(row.balance) },
  ]

  const purchaseExportColumns = [
    ...purchaseColumns,
    { key: 'cashMovementId', label: 'Mov. caja' },
    { key: 'stockMovementId', label: 'Mov. stock' },
    { key: 'voidReason', label: 'Motivo anulación' },
    { key: 'notes', label: 'Notas' },
  ]

  function handlePurchaseChange(name, value) {
    setPurchaseForm((current) => ({ ...current, [name]: value, ...(name === 'date' ? { shiftId: '' } : {}) }))
  }

  function handleProductChange(name, value) {
    setProductForm((current) => ({ ...current, [name]: value }))
  }

  function handleSupplierChange(name, value) {
    setSupplierForm((current) => ({ ...current, [name]: value }))
  }

  function openProductModal(row = null) {
    setEditingProduct(row)
    setProductForm(row ? { ...productInitialForm, ...row } : productInitialForm)
    setProductModalOpen(true)
  }

  function openSupplierModal(row = null) {
    setEditingSupplier(row)
    setSupplierForm(row ? { ...supplierInitialForm, ...row } : supplierInitialForm)
    setSupplierModalOpen(true)
  }

  async function savePurchase(event) {
    event.preventDefault()
    if (!canWritePurchases) {
      feedback.warning('No tenés permiso para crear compras.')
      return
    }
    if (!selectedProduct) return
    if (purchaseForm.paid && !selectedShift) {
      feedback.warning('No hay caja del día abierta. Abrí la caja diaria para registrar el egreso de la compra pagada.')
      return
    }
    setSaving(true)
    try {
      await repository.createPurchaseTransaction({
        ...purchaseForm,
        qty: numberValue(purchaseForm.qty) || 1,
        cost: numberValue(purchaseForm.cost),
        supplierName: supplierMap[purchaseForm.supplierId] || '',
        supplierPhone: supplierById[purchaseForm.supplierId]?.phone || '',
        productName: productMap[purchaseForm.productId] || selectedProduct?.name || '',
        productSku: productById[purchaseForm.productId]?.sku || selectedProduct?.sku || '',
        ...(selectedShift ? {
          shiftId: selectedShift.id,
          shiftName: 'Caja del día',
          shiftDate: selectedShift.date || purchaseForm.date,
          ...shiftUserPayload(selectedShift),
        } : {}),
      })
      feedback.success('La compra se registró con reposición de stock, caja y auditoría.')
      purchases.refresh?.()
      productsPanel.refresh?.()
      setPurchaseModalOpen(false)
      setPurchaseForm(purchaseInitialForm)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la compra.')
    } finally {
      setSaving(false)
    }
  }

  async function saveProduct(event) {
    event.preventDefault()
    if (!canWriteStock) {
      feedback.warning('No tenés permiso para modificar productos.')
      return
    }
    if (!productForm.name.trim()) {
      feedback.warning('Indicá el nombre del producto.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...productForm,
        name: productForm.name.trim(),
        cost: numberValue(productForm.cost),
        price: numberValue(productForm.price),
        stock: numberValue(productForm.stock),
        minStock: numberValue(productForm.minStock),
        active: productForm.active !== false,
      }
      if (editingProduct) await repository.updateDocument('products', editingProduct.id, payload)
      else await repository.createDocument('products', payload)
      feedback.success(editingProduct ? 'Producto actualizado.' : 'Producto creado.')
      productsPanel.refresh?.()
      setProductModalOpen(false)
      setEditingProduct(null)
      setProductForm(productInitialForm)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  async function saveSupplier(event) {
    event.preventDefault()
    if (!canWritePurchases) {
      feedback.warning('No tenés permiso para modificar proveedores.')
      return
    }
    if (!supplierForm.name.trim()) {
      feedback.warning('Indicá el nombre del proveedor.')
      return
    }
    setSaving(true)
    try {
      const payload = { ...supplierForm, name: supplierForm.name.trim(), balance: numberValue(supplierForm.balance) }
      if (editingSupplier) await repository.updateDocument('suppliers', editingSupplier.id, payload)
      else await repository.createDocument('suppliers', payload)
      feedback.success(editingSupplier ? 'Proveedor actualizado.' : 'Proveedor creado.')
      suppliersPanel.refresh?.()
      setSupplierModalOpen(false)
      setEditingSupplier(null)
      setSupplierForm(supplierInitialForm)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el proveedor.')
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
    if (!canWritePurchases || !voidingPurchase) return
    if (!voidReason.trim()) {
      feedback.warning('Indicá un motivo de anulación.')
      return
    }
    setSaving(true)
    try {
      await repository.voidPurchaseTransaction(voidingPurchase, { reason: voidReason.trim(), date: todayISO() })
      feedback.success('La compra fue anulada y se revirtió stock/caja cuando correspondía.')
      purchases.refresh?.()
      productsPanel.refresh?.()
      setVoidingPurchase(null)
      setVoidReason('')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo anular la compra.')
    } finally {
      setSaving(false)
    }
  }

  async function loadMegavetCatalog() {
    if (catalogItems.length) return catalogItems
    setCatalogLoading(true)
    try {
      const response = await fetch(MEGAVET_CATALOG_URL, { cache: 'no-store' })
      if (!response.ok) throw new Error('No se pudo leer el archivo del catálogo Megavet.')
      const items = await response.json()
      if (!Array.isArray(items) || items.length !== MEGAVET_CATALOG_SUMMARY.total) {
        throw new Error('El catálogo Megavet está incompleto o tiene un formato inválido.')
      }
      setCatalogItems(items)
      return items
    } finally {
      setCatalogLoading(false)
    }
  }

  async function openMegavetCatalogImport() {
    setCatalogImportResult(null)
    setCatalogImportOpen(true)
    try {
      await loadMegavetCatalog()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo preparar el catálogo de productos.')
    }
  }

  async function importMegavetCatalog() {
    if (!canWriteStock) {
      feedback.warning('No tenés permiso para importar productos.')
      return
    }

    setCatalogImporting(true)
    setCatalogImportResult(null)
    setCatalogImportProgress({ processed: 0, total: MEGAVET_CATALOG_SUMMARY.total })

    try {
      const items = await loadMegavetCatalog()
      const result = await repository.importProductCatalog(items, {
        onProgress: (progress) => setCatalogImportProgress(progress),
      })
      setCatalogImportResult(result)
      productsPanel.refresh?.()
      refreshProducts?.()
      feedback.success(`Catálogo importado: ${result.created} creados y ${result.updated} actualizados.`)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo importar el catálogo de productos.')
    } finally {
      setCatalogImporting(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Compras e inventario"
        title="Compras, proveedores, productos y stock"
        description="Centro único para comprar, reponer stock, crear productos y administrar proveedores sin saltar entre secciones."
        actions={
          <>
            <ExportButtons
              title="Compras"
              subtitle="Compras filtradas con proveedor, producto, stock, caja y estado."
              rows={purchases.items}
              getRows={purchases.fetchAllForExport}
              columns={purchaseExportColumns}
              summary={[
                { label: 'Compras activas', value: activePurchases.length },
                { label: 'Total activo', value: money(totalActive) },
              ]}
              fileLabel="compras"
            />
            {canWriteStock && activeTab === 'products' && <button className="btn" onClick={openMegavetCatalogImport}>Importar lista Megavet</button>}
            {canWriteStock && <button className="btn" onClick={() => openProductModal()}>Nuevo producto</button>}
            {canWritePurchases && <button className="btn" onClick={() => openSupplierModal()}>Nuevo proveedor</button>}
            {canWritePurchases && <button className="btn btn-primary" onClick={() => setPurchaseModalOpen(true)}>Nueva compra</button>}
          </>
        }
      />

      <div className="stats-grid compact">
        <StatCard label="Compras activas" value={activePurchases.length} />
        <StatCard label="Total activo" value={money(totalActive)} tone="warning" />
        <StatCard label="Stock bajo" value={lowStockProducts.length} tone={lowStockProducts.length ? 'danger' : 'success'} />
        <StatCard label="Proveedores visibles" value={suppliersPanel.items.length} tone="info" />
      </div>

      <div className="section-tabs" role="tablist" aria-label="Compras e inventario">
        <button type="button" className={activeTab === 'purchases' ? 'active' : ''} onClick={() => setActiveTab('purchases')}>Compras</button>
        <button type="button" className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>Productos y stock</button>
        <button type="button" className={activeTab === 'suppliers' ? 'active' : ''} onClick={() => setActiveTab('suppliers')}>Proveedores</button>
        <button type="button" className={activeTab === 'future' ? 'active' : ''} onClick={() => setActiveTab('future')}>Compras futuras</button>
      </div>

      {activeTab === 'purchases' && (
        <div className="inventory-panel-stack">
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
            columns={purchaseColumns}
            actions={(row) => (
              <>
                {canWritePurchases && row.status !== 'Anulada' && <button className="btn btn-small btn-danger" onClick={() => openVoid(row)}>Anular</button>}
              </>
            )}
          />
          <Pagination {...purchases} onPageSizeChange={purchases.setPageSize} total={purchases.items.length} limit={purchases.pageSize} />
        </div>
      )}

      {activeTab === 'products' && (
        <div className="inventory-panel-stack">
          <ListToolbar
            query={productsPanel.query}
            onQueryChange={productsPanel.setQuery}
            placeholder="Buscar producto por nombre, SKU, categoría, tipo o unidad..."
            onClearFilters={productsPanel.clearFilters}
          />
          <DataTable
            rows={productsPanel.items}
            columns={productColumns}
            actions={(row) => (
              <>
                {canWriteStock && <button className="btn btn-small" onClick={() => openProductModal(row)}>Editar</button>}
              </>
            )}
          />
          <Pagination {...productsPanel} onPageSizeChange={productsPanel.setPageSize} total={productsPanel.items.length} limit={productsPanel.pageSize} />
        </div>
      )}

      {activeTab === 'suppliers' && (
        <div className="inventory-panel-stack">
          <ListToolbar
            query={suppliersPanel.query}
            onQueryChange={suppliersPanel.setQuery}
            placeholder="Buscar proveedor por nombre, CUIT, teléfono, email o dirección..."
            onClearFilters={suppliersPanel.clearFilters}
          />
          <DataTable
            rows={suppliersPanel.items}
            columns={supplierColumns}
            actions={(row) => (
              <>
                {canWritePurchases && <button className="btn btn-small" onClick={() => openSupplierModal(row)}>Editar</button>}
              </>
            )}
          />
          <Pagination {...suppliersPanel} onPageSizeChange={suppliersPanel.setPageSize} total={suppliersPanel.items.length} limit={suppliersPanel.pageSize} />
        </div>
      )}

      {activeTab === 'future' && (
        <div className="inventory-panel-stack embedded-module ops-center-module">
          <FuturePurchasesPage />
        </div>
      )}

      {purchaseModalOpen && (
        <Modal
          title="Nueva compra"
          onClose={() => setPurchaseModalOpen(false)}
          footer={
            <>
              <strong className="modal-total">Total: {money(purchaseTotal)}</strong>
              <button className="btn" type="button" onClick={() => setPurchaseModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={purchaseFormId} disabled={saving || !selectedProduct}>
                {saving ? 'Guardando...' : 'Guardar compra'}
              </button>
            </>
          }
        >
          <form id={purchaseFormId} onSubmit={savePurchase}>
            <FormGrid
              value={purchaseForm}
              onChange={handlePurchaseChange}
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
            {purchaseForm.paid && !selectedShift && (
              <div className="system-card system-card-warning compact-card">
                <strong>No hay caja del día abierta.</strong> Abrí la caja diaria para registrar esta compra pagada.
              </div>
            )}
            {selectedProduct && <div className="preview-box">Stock actual: {selectedProduct.stock} · Nuevo stock estimado: {numberValue(selectedProduct.stock) + numberValue(purchaseForm.qty)}</div>}
          </form>
        </Modal>
      )}

      {catalogImportOpen && (
        <Modal
          title="Importar catálogo Megavet"
          onClose={() => !catalogImporting && setCatalogImportOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setCatalogImportOpen(false)} disabled={catalogImporting}>
                {catalogImportResult ? 'Cerrar' : 'Cancelar'}
              </button>
              {!catalogImportResult && (
                <button className="btn btn-primary" type="button" onClick={importMegavetCatalog} disabled={catalogImporting || catalogLoading || !catalogItems.length}>
                  {catalogLoading ? 'Preparando...' : catalogImporting ? 'Importando...' : `Importar ${MEGAVET_CATALOG_SUMMARY.total} productos`}
                </button>
              )}
            </>
          }
        >
          <div className="inventory-panel-stack">
            <div className="system-card compact-card">
              <strong>Lista Nº2 Julio - Megavet Distribuidora</strong>
              <p>
                Se cargarán {MEGAVET_CATALOG_SUMMARY.total} productos: {MEGAVET_CATALOG_SUMMARY.dogs} para perro y {MEGAVET_CATALOG_SUMMARY.cats} para gato.
                La columna «Precio» del PDF se guarda como costo y «Público» como precio de venta.
              </p>
            </div>

            <div className="system-card system-card-warning compact-card">
              <strong>Importación segura</strong>
              <p>
                Los productos nuevos se crean con stock 0. Si un producto ya existe, se actualizan sus datos y precios sin modificar el stock,
                el stock mínimo ni su estado activo. No se elimina ningún producto existente.
              </p>
              {MEGAVET_CATALOG_SUMMARY.zeroPrice > 0 && (
                <p>{MEGAVET_CATALOG_SUMMARY.zeroPrice} producto con precio $0 quedará inactivo para evitar ventas accidentales.</p>
              )}
            </div>

            {catalogLoading && (
              <div className="preview-box">Preparando el catálogo...</div>
            )}

            {catalogImporting && (
              <div className="preview-box">
                Importando {catalogImportProgress.processed || 0} de {catalogImportProgress.total || MEGAVET_CATALOG_SUMMARY.total} productos...
              </div>
            )}

            {catalogImportResult && (
              <div className="system-card system-card-success compact-card">
                <strong>Importación terminada</strong>
                <p>
                  {catalogImportResult.created} productos creados y {catalogImportResult.updated} actualizados.
                </p>
              </div>
            )}

            <DataTable
              rows={catalogItems.slice(0, 6)}
              columns={[
                { key: 'name', label: 'Ejemplo de producto' },
                { key: 'cost', label: 'Costo', render: (row) => money(row.cost) },
                { key: 'price', label: 'Público', render: (row) => money(row.price) },
              ]}
            />
          </div>
        </Modal>
      )}

      {productModalOpen && (
        <Modal
          title={editingProduct ? 'Editar producto / stock' : 'Nuevo producto / stock'}
          onClose={() => setProductModalOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setProductModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={productFormId} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar producto'}
              </button>
            </>
          }
        >
          <form id={productFormId} onSubmit={saveProduct}>
            <FormGrid
              value={productForm}
              onChange={handleProductChange}
              fields={[
                { name: 'sku', label: 'SKU / código' },
                { name: 'name', label: 'Nombre', required: true },
                { name: 'category', label: 'Categoría' },
                { name: 'type', label: 'Tipo', type: 'select', options: ['Producto', 'Servicio'] },
                { name: 'cost', label: 'Costo', type: 'number' },
                { name: 'price', label: 'Precio venta', type: 'number' },
                { name: 'stock', label: 'Stock actual', type: 'number', readOnly: true, hint: 'El stock se mueve desde compras, ventas y anulaciones.' },
                { name: 'minStock', label: 'Stock mínimo', type: 'number' },
                { name: 'unit', label: 'Unidad', type: 'select', options: ['unidad', 'servicio', 'bolsa', 'frasco', 'caja', 'kg', 'litro'] },
                { name: 'active', label: 'Activo', type: 'checkbox' },
              ]}
            />
          </form>
        </Modal>
      )}

      {supplierModalOpen && (
        <Modal
          title={editingSupplier ? 'Editar proveedor' : 'Nuevo proveedor'}
          onClose={() => setSupplierModalOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setSupplierModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={supplierFormId} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar proveedor'}
              </button>
            </>
          }
        >
          <form id={supplierFormId} onSubmit={saveSupplier}>
            <FormGrid
              value={supplierForm}
              onChange={handleSupplierChange}
              fields={[
                { name: 'name', label: 'Razón social / nombre', required: true },
                { name: 'cuit', label: 'CUIT' },
                { name: 'phone', label: 'Teléfono' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'address', label: 'Dirección' },
                { name: 'balance', label: 'Saldo', type: 'number' },
                { name: 'notes', label: 'Notas', type: 'textarea' },
              ]}
            />
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
