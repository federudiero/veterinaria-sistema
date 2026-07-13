import { seedData } from '../../data/seedData.js'
import { EXPORT_BATCH_SIZE, MAX_EXPORT_ROWS, MAX_LIST_LIMIT } from '../../config/performance.js'
import { buildSearchPayload, matchesSearch, normalizeSearchText } from '../../utils/search.js'
import { calculateSalePricing } from '../../utils/salesPricing.js'

const STORAGE_KEY = 'vetgest-pro-comercial-v10'
const listeners = new Map()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function indexDocument(document) {
  return { ...document, ...buildSearchPayload(document) }
}

function nowISO() {
  return new Date().toISOString()
}

function todayISO() {
  const value = new Date()
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function numberValue(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function actorPayload() {
  return { userUid: 'local-demo', userEmail: 'demo@sistema-veterinaria.local' }
}

function isSharedDailyCashSession(shift = {}) {
  return shift.cashSessionScope === 'sharedDaily' || shift.sharedDaily === true || String(shift.id || shift.shiftId || '').startsWith('daily_')
}

function dailyCashSessionDocumentId(date = '') {
  return `daily_${date || todayISO()}`
}

function shiftPayload(input = {}) {
  const resolvedShiftId = input.shiftId || input.id || ''
  const isShared = isSharedDailyCashSession({ ...input, id: resolvedShiftId })
  return {
    shiftId: resolvedShiftId,
    shiftName: isShared ? 'Caja del día' : input.shiftName || input.name || (resolvedShiftId ? 'Caja sin nombre' : 'Sin caja'),
    shiftDate: input.shiftDate || input.date || todayISO(),
    veterinarianIds: isShared ? [] : Array.isArray(input.veterinarianIds) ? input.veterinarianIds : [],
    veterinarianNames: isShared ? [] : Array.isArray(input.veterinarianNames) ? input.veterinarianNames : [],
  }
}

function assertOpenShift(state, input = {}) {
  if (!input.shiftId) return null
  const shift = (state.shifts || []).find((item) => item.id === input.shiftId)
  if (!shift) throw new Error('La caja seleccionada ya no existe.')
  if (shift.status === 'Cerrado') throw new Error('No se puede operar sobre una caja cerrada.')
  return shift
}

function assertRequiredOpenShift(state, input = {}) {
  if (!input.shiftId) throw new Error('Seleccioná una caja abierta antes de operar.')
  return assertOpenShift(state, input)
}

function getInitialState() {
  const now = nowISO()
  return Object.fromEntries(
    Object.entries(seedData).map(([collectionName, documents]) => [
      collectionName,
      documents.map((document) => indexDocument({ ...document, createdAt: now, updatedAt: now })),
    ]),
  )
}

function readState() {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = getInitialState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.stockMovements) parsed.stockMovements = []
    if (!parsed.auditLogs) parsed.auditLogs = []
    if (!parsed.shifts) parsed.shifts = []
    if (!parsed.globalCashClosures) parsed.globalCashClosures = []
    return parsed
  } catch {
    const initial = getInitialState()
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

function writeState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function applyFilters(data, options = {}) {
  let rows = [...data]
  if (options.searchTerm) {
    rows = rows.filter((item) => matchesSearch(item, options.searchTerm))
  }
  if (Array.isArray(options.where)) {
    options.where.forEach(({ field, op, value }) => {
      if (value === undefined || value === '') return
      rows = rows.filter((item) => {
        if (op === '==') return item[field] === value
        if (op === '!=') return item[field] !== value
        if (op === '>') return item[field] > value
        if (op === '>=') return item[field] >= value
        if (op === '<') return item[field] < value
        if (op === '<=') return item[field] <= value
        if (op === 'in') return Array.isArray(value) && value.includes(item[field])
        if (op === 'array-contains') return Array.isArray(item[field]) && item[field].includes(value)
        return true
      })
    })
  }
  return rows
}

function applySort(data, options = {}) {
  const rows = [...data]
  const orderByField = options.orderByField || 'updatedAt'
  const direction = options.orderDirection === 'asc' ? 1 : -1
  rows.sort((a, b) => String(a[orderByField] || '').localeCompare(String(b[orderByField] || '')) * direction)
  return rows
}

function safeLimit(value) {
  return Math.min(Math.max(Number(value || MAX_LIST_LIMIT), 1), MAX_LIST_LIMIT)
}

function applyOptions(data, options = {}) {
  return applySort(applyFilters(data, options), options).slice(0, safeLimit(options.limitCount))
}

function emit(collectionName) {
  const state = readState()
  const data = clone(state[collectionName] || [])
  const collectionListeners = listeners.get(collectionName) || new Set()
  collectionListeners.forEach(({ callback, options }) => callback(applyOptions(data, options)))
}

function emitMany(collectionNames) {
  ;[...new Set(collectionNames)].forEach(emit)
}

function idFor(collectionName) {
  return `${collectionName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function addAudit(state, { module, action, entityId, summary, before = null, after = null, severity = 'info' }) {
  const now = nowISO()
  const item = indexDocument({
    id: idFor('auditLogs'),
    module,
    action,
    entityId,
    summary,
    severity,
    before,
    after,
    createdAt: now,
    createdAtISO: now,
    ...actorPayload(),
  })
  state.auditLogs = [item, ...(state.auditLogs || [])]
  return item.id
}

export function subscribeCollection(collectionName, callback, _onError, options = {}) {
  if (!listeners.has(collectionName)) listeners.set(collectionName, new Set())
  const entry = { callback, options }
  listeners.get(collectionName).add(entry)
  callback(applyOptions(clone(readState()[collectionName] || []), options))

  return () => {
    listeners.get(collectionName)?.delete(entry)
  }
}

export async function fetchCollectionPage(collectionName, options = {}) {
  const state = readState()
  const allRows = applySort(applyFilters(clone(state[collectionName] || []), options), options)
  const pageSize = safeLimit(options.limitCount)
  const start = Math.max(Number(options.startAfterDoc || 0), 0)
  const rows = allRows.slice(start, start + pageSize)

  return {
    rows,
    firstDoc: start,
    lastDoc: start + rows.length,
    hasMore: start + rows.length < allRows.length,
    pageSize,
  }
}

export async function fetchCollectionForExport(collectionName, options = {}) {
  const rows = []
  let startAfterDoc = 0
  let hasMore = true

  while (hasMore && rows.length < MAX_EXPORT_ROWS) {
    const limitCount = Math.min(EXPORT_BATCH_SIZE, MAX_EXPORT_ROWS - rows.length)
    const result = await fetchCollectionPage(collectionName, {
      ...options,
      startAfterDoc,
      limitCount,
    })
    rows.push(...(result.rows || []))
    startAfterDoc = result.lastDoc || startAfterDoc + limitCount
    hasMore = Boolean(result.hasMore)
  }

  return { rows, truncated: hasMore, maxRows: MAX_EXPORT_ROWS }
}

export async function getCollectionCount(collectionName, options = {}) {
  const state = readState()
  return applyFilters(clone(state[collectionName] || []), options).length
}

export async function createDocument(collectionName, payload) {
  const state = readState()
  const now = nowISO()
  const id = payload.id || idFor(collectionName)
  const item = indexDocument({ ...payload, id, createdAt: now, updatedAt: now })
  state[collectionName] = [item, ...(state[collectionName] || [])]
  if (collectionName !== 'auditLogs') {
    addAudit(state, {
      module: collectionName,
      action: 'create',
      entityId: id,
      summary: `Creación de registro en ${collectionName}`,
      after: item,
    })
  }
  writeState(state)
  emitMany([collectionName, 'auditLogs'])
  return id
}

export async function setDocument(collectionName, id, payload) {
  const state = readState()
  const now = nowISO()
  const items = state[collectionName] || []
  const previous = items.find((item) => item.id === id) || null
  const exists = Boolean(previous)
  const nextItem = exists
    ? indexDocument({ ...previous, ...payload, id, updatedAt: now })
    : indexDocument({ ...payload, id, createdAt: now, updatedAt: now })
  state[collectionName] = exists
    ? items.map((item) => (item.id === id ? nextItem : item))
    : [nextItem, ...items]
  if (collectionName !== 'auditLogs') {
    addAudit(state, {
      module: collectionName,
      action: exists ? 'set' : 'create',
      entityId: id,
      summary: `${exists ? 'Actualización' : 'Creación'} de registro en ${collectionName}`,
      before: previous,
      after: nextItem,
    })
  }
  writeState(state)
  emitMany([collectionName, 'auditLogs'])
  return id
}

export async function importProductCatalog(items = [], { onProgress } = {}) {
  const normalizedItems = Array.isArray(items)
    ? items.filter((item) => item?.id && item?.name)
    : []
  if (!normalizedItems.length) throw new Error('El catálogo no contiene productos válidos para importar.')

  const state = readState()
  const now = nowISO()
  const currentProducts = state.products || []
  const existingById = new Map(currentProducts.map((item) => [item.id, item]))
  const existingByCatalogId = new Map(currentProducts
    .filter((item) => item.catalogImportId)
    .map((item) => [String(item.catalogImportId), item]))
  const existingByName = new Map()
  currentProducts.forEach((item) => {
    const key = normalizeSearchText(item.name)
    if (key && !existingByName.has(key)) existingByName.set(key, item)
  })

  const nextProductsById = new Map(currentProducts.map((item) => [item.id, item]))
  let created = 0
  let updated = 0

  normalizedItems.forEach((sourceItem, index) => {
    const { id: catalogImportId, ...rawPayload } = sourceItem
    const normalizedName = normalizeSearchText(rawPayload.name)
    const existing = existingByCatalogId.get(catalogImportId)
      || existingById.get(catalogImportId)
      || existingByName.get(normalizedName)
    const targetId = existing?.id || catalogImportId
    const payload = {
      ...rawPayload,
      catalogImportId,
      catalogImportedAt: now,
      updatedAt: now,
    }

    if (existing) {
      payload.stock = existing.stock
      payload.minStock = existing.minStock
      payload.active = existing.active
      payload.createdAt = existing.createdAt
      updated += 1
    } else {
      payload.createdAt = now
      created += 1
    }

    nextProductsById.set(targetId, indexDocument({
      ...(existing || {}),
      ...payload,
      id: targetId,
    }))

    if ((index + 1) % 200 === 0 || index + 1 === normalizedItems.length) {
      onProgress?.({ processed: index + 1, total: normalizedItems.length, created, updated })
    }
  })

  state.products = Array.from(nextProductsById.values())
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))

  addAudit(state, {
    module: 'products',
    action: 'products.catalog.import',
    entityId: 'megavet-lista-2-julio-3',
    summary: `Importación catálogo Megavet: ${normalizedItems.length} productos`,
    after: { source: 'LISTA Nº2 JULIO - 3', created, updated },
    severity: 'warning',
  })

  writeState(state)
  emitMany(['products', 'auditLogs'])
  return { total: normalizedItems.length, created, updated }
}


export async function ensureDailyCashSession(input = {}) {
  const state = readState()
  const now = nowISO()
  const date = input.date || todayISO()
  const id = dailyCashSessionDocumentId(date)
  const existing = (state.shifts || []).find((item) => item.id === id)

  if (existing) return { ...clone(existing), existing: true }

  const actor = actorPayload()
  const item = indexDocument({
    id,
    date,
    name: 'Caja del día',
    cashSessionScope: 'sharedDaily',
    sharedDaily: true,
    startTime: input.startTime || '',
    endTime: input.endTime || '',
    veterinarianIds: [],
    veterinarianNames: [],
    cashierIds: [],
    cashierNames: [],
    responsibleUserIds: [],
    responsibleUserNames: [],
    openedBy: input.openedBy || actor.userUid,
    openedByName: input.openedByName || actor.userEmail,
    status: 'Abierto',
    notes: input.notes || 'Caja diaria compartida para todo el negocio.',
    createdAt: now,
    updatedAt: now,
    ...actor,
  })

  state.shifts = [item, ...(state.shifts || [])]
  addAudit(state, {
    module: 'shifts',
    action: 'cash.daily.ensure',
    entityId: id,
    summary: `Apertura de caja diaria compartida ${date}`,
    after: item,
  })
  writeState(state)
  emitMany(['shifts', 'auditLogs'])
  return { ...clone(item), created: true }
}

export async function updateDocument(collectionName, id, payload) {
  const state = readState()
  const now = nowISO()
  let previous = null
  state[collectionName] = (state[collectionName] || []).map((item) => {
    if (item.id !== id) return item
    previous = item
    return indexDocument({ ...item, ...payload, id, updatedAt: now })
  })
  if (collectionName !== 'auditLogs') {
    addAudit(state, {
      module: collectionName,
      action: 'update',
      entityId: id,
      summary: `Actualización de registro en ${collectionName}`,
      before: previous,
      after: payload,
    })
  }
  writeState(state)
  emitMany([collectionName, 'auditLogs'])
  return id
}

export async function deleteDocument(collectionName, id) {
  const state = readState()
  const previous = (state[collectionName] || []).find((item) => item.id === id) || null
  state[collectionName] = (state[collectionName] || []).filter((item) => item.id !== id)
  if (collectionName !== 'auditLogs') {
    addAudit(state, {
      module: collectionName,
      action: 'delete',
      entityId: id,
      summary: `Eliminación de registro en ${collectionName}`,
      before: previous,
      severity: 'warning',
    })
  }
  writeState(state)
  emitMany([collectionName, 'auditLogs'])
  return id
}

export async function seedDemoData({ overwrite = true } = {}) {
  if (overwrite) {
    writeState(getInitialState())
    Object.keys(seedData).forEach(emit)
  }
}

export async function createSaleTransaction(input) {
  const state = readState()
  const now = nowISO()
  const shift = assertRequiredOpenShift(state, input)
  const product = (state.products || []).find((item) => item.id === input.productId)
  if (!product) throw new Error('El producto seleccionado ya no existe.')
  if (product.active === false) throw new Error('El producto seleccionado está inactivo.')

  const qty = Math.max(1, numberValue(input.qty))
  const subtotal = qty * numberValue(product.price)
  const pricing = calculateSalePricing({
    subtotal,
    paymentMethod: input.paymentMethod,
    creditSurchargePercent: input.creditSurchargePercent,
  })
  const total = pricing.total
  const paid = input.paymentMethod !== 'Cuenta corriente' && input.paid === true
  const isStockProduct = product.type === 'Producto'
  const currentStock = numberValue(product.stock)
  if (isStockProduct && currentStock < qty) throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${currentStock}.`)

  const saleId = idFor('sales')
  const cashId = paid ? idFor('cashMovements') : ''
  const accountId = paid ? '' : idFor('currentAccounts')
  const stockMovementId = isStockProduct ? idFor('stockMovements') : ''
  const item = { productId: product.id, name: product.name, qty, price: numberValue(product.price), cost: numberValue(product.cost), type: product.type || 'Producto' }

  const sale = indexDocument({
    id: saleId,
    date: input.date || todayISO(),
    clientId: input.clientId || '',
    patientId: input.patientId || '',
    clientName: input.clientName || '',
    patientName: input.patientName || '',
    items: [item],
    total,
    subtotal: pricing.subtotal,
    creditSurchargePercent: pricing.creditSurchargePercent,
    creditSurchargeAmount: pricing.creditSurchargeAmount,
    paymentMethod: paid ? input.paymentMethod : 'Cuenta corriente',
    paid,
    paymentStatus: paid ? 'Pagada' : 'Pendiente',
    status: 'Activa',
    notes: input.notes || '',
    tagIds: Array.isArray(input.tagIds) ? input.tagIds : [],
    tagNames: Array.isArray(input.tagNames) ? input.tagNames : [],
    cashMovementId: cashId,
    currentAccountId: accountId,
    stockMovementIds: stockMovementId ? [stockMovementId] : [],
    stockAffected: isStockProduct,
    ...shiftPayload({ ...input, ...(shift || {}) }),
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  })

  state.sales = [sale, ...(state.sales || [])]

  if (isStockProduct) {
    state.products = (state.products || []).map((itemProduct) => itemProduct.id === product.id ? indexDocument({ ...itemProduct, stock: currentStock - qty, updatedAt: now }) : itemProduct)
    state.stockMovements = [indexDocument({
      id: stockMovementId,
      date: input.date || todayISO(),
      productId: product.id,
      productName: product.name,
      type: 'Salida',
      source: 'Venta',
      qty: -qty,
      previousStock: currentStock,
      newStock: currentStock - qty,
      relatedSaleId: saleId,
      notes: `Venta ${saleId}`,
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.stockMovements || [])]
  }

  if (paid) {
    state.cashMovements = [indexDocument({
      id: cashId,
      date: input.date || todayISO(),
      type: 'Ingreso',
      concept: `Venta ${product.name}`,
      method: input.paymentMethod,
      amount: total,
      subtotal: pricing.subtotal,
      creditSurchargePercent: pricing.creditSurchargePercent,
      creditSurchargeAmount: pricing.creditSurchargeAmount,
      closed: false,
      status: 'Activo',
      relatedSaleId: saleId,
      clientId: input.clientId || '',
      patientId: input.patientId || '',
      clientName: input.clientName || '',
      patientName: input.patientName || '',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.cashMovements || [])]
  } else {
    state.currentAccounts = [indexDocument({
      id: accountId,
      date: input.date || todayISO(),
      dueDate: input.dueDate || '',
      clientId: input.clientId || '',
      patientId: input.patientId || '',
      type: 'Deuda',
      concept: `Venta ${product.name}`,
      amount: total,
      subtotal: pricing.subtotal,
      creditSurchargePercent: pricing.creditSurchargePercent,
      creditSurchargeAmount: pricing.creditSurchargeAmount,
      paidAmount: 0,
      status: 'Pendiente',
      relatedSaleId: saleId,
      notes: input.notes || '',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.currentAccounts || [])]
  }

  addAudit(state, { module: 'sales', action: 'sale.create.transaction', entityId: saleId, summary: `Venta transaccional por ${total}`, after: sale })
  writeState(state)
  emitMany(['sales', 'products', 'stockMovements', 'cashMovements', 'currentAccounts', 'auditLogs'])
  return saleId
}


export async function createReminderSaleTransaction(input) {
  const state = readState()
  const now = nowISO()
  const shift = assertRequiredOpenShift(state, input)
  const product = input.productId ? (state.products || []).find((item) => item.id === input.productId) : null
  if (input.productId && !product) throw new Error('El producto seleccionado ya no existe.')
  if (product?.active === false) throw new Error('El producto seleccionado está inactivo.')

  const qty = Math.max(1, numberValue(input.qty) || 1)
  const unitPrice = numberValue(input.unitPrice || product?.price)
  if (unitPrice <= 0) throw new Error('Indicá un precio unitario para generar la venta.')

  const productName = input.productName || product?.name || 'Producto manual'
  const subtotal = qty * unitPrice
  const pricing = calculateSalePricing({
    subtotal,
    paymentMethod: input.paymentMethod,
    creditSurchargePercent: input.creditSurchargePercent,
  })
  const total = pricing.total
  const paid = input.paymentMethod !== 'Cuenta corriente' && input.paid === true
  const shouldAffectStock = Boolean(input.stockAffected && product && product.type === 'Producto')
  const currentStock = numberValue(product?.stock)

  if (input.stockAffected && !product) throw new Error('Para afectar stock, seleccioná un producto registrado.')
  if (shouldAffectStock && currentStock < qty) throw new Error(`Stock insuficiente para ${productName}. Disponible: ${currentStock}.`)

  const saleId = idFor('sales')
  const cashId = paid ? idFor('cashMovements') : ''
  const accountId = paid ? '' : idFor('currentAccounts')
  const stockMovementId = shouldAffectStock ? idFor('stockMovements') : ''
  const item = {
    productId: product?.id || '',
    name: productName,
    qty,
    price: unitPrice,
    cost: numberValue(product?.cost),
    type: product?.type || 'Producto manual',
  }

  const sale = indexDocument({
    id: saleId,
    date: input.date || todayISO(),
    clientId: input.clientId || '',
    patientId: input.patientId || '',
    clientName: input.clientName || '',
    patientName: input.patientName || '',
    items: [item],
    total,
    subtotal: pricing.subtotal,
    creditSurchargePercent: pricing.creditSurchargePercent,
    creditSurchargeAmount: pricing.creditSurchargeAmount,
    paymentMethod: paid ? input.paymentMethod : 'Cuenta corriente',
    paid,
    paymentStatus: paid ? 'Pagada' : 'Pendiente',
    status: 'Activa',
    notes: input.notes || '',
    tagIds: Array.isArray(input.tagIds) ? input.tagIds : [],
    tagNames: Array.isArray(input.tagNames) ? input.tagNames : [],
    origin: 'recordatorio',
    sourceReminderId: input.reminderId || '',
    cashMovementId: cashId,
    currentAccountId: accountId,
    stockMovementIds: stockMovementId ? [stockMovementId] : [],
    stockAffected: shouldAffectStock,
    ...shiftPayload({ ...input, ...(shift || {}) }),
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  })

  state.sales = [sale, ...(state.sales || [])]

  if (shouldAffectStock) {
    state.products = (state.products || []).map((itemProduct) => itemProduct.id === product.id ? indexDocument({ ...itemProduct, stock: currentStock - qty, updatedAt: now }) : itemProduct)
    state.stockMovements = [indexDocument({
      id: stockMovementId,
      date: input.date || todayISO(),
      productId: product.id,
      productName,
      type: 'Salida',
      source: 'Venta desde recordatorio',
      qty: -qty,
      previousStock: currentStock,
      newStock: currentStock - qty,
      relatedSaleId: saleId,
      relatedReminderId: input.reminderId || '',
      notes: `Venta ${saleId} generada desde recordatorio`,
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.stockMovements || [])]
  }

  if (paid) {
    state.cashMovements = [indexDocument({
      id: cashId,
      date: input.date || todayISO(),
      type: 'Ingreso',
      concept: `Venta futura ${productName}`,
      method: input.paymentMethod,
      amount: total,
      subtotal: pricing.subtotal,
      creditSurchargePercent: pricing.creditSurchargePercent,
      creditSurchargeAmount: pricing.creditSurchargeAmount,
      closed: false,
      status: 'Activo',
      relatedSaleId: saleId,
      relatedReminderId: input.reminderId || '',
      clientId: input.clientId || '',
      patientId: input.patientId || '',
      clientName: input.clientName || '',
      patientName: input.patientName || '',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.cashMovements || [])]
  } else {
    state.currentAccounts = [indexDocument({
      id: accountId,
      date: input.date || todayISO(),
      dueDate: input.dueDate || '',
      clientId: input.clientId || '',
      patientId: input.patientId || '',
      type: 'Deuda',
      concept: `Venta futura ${productName}`,
      amount: total,
      subtotal: pricing.subtotal,
      creditSurchargePercent: pricing.creditSurchargePercent,
      creditSurchargeAmount: pricing.creditSurchargeAmount,
      paidAmount: 0,
      status: 'Pendiente',
      relatedSaleId: saleId,
      relatedReminderId: input.reminderId || '',
      notes: input.notes || '',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.currentAccounts || [])]
  }

  if (input.reminderId) {
    state.reminders = (state.reminders || []).map((itemReminder) => itemReminder.id === input.reminderId
      ? indexDocument({
        ...itemReminder,
        status: paid ? 'Venta cargada' : 'Venta pendiente',
        saleGenerated: true,
        relatedSaleId: saleId,
        saleGeneratedAt: now,
        stockAffectedOnSale: shouldAffectStock,
        updatedAt: now,
      })
      : itemReminder)
  }

  addAudit(state, { module: 'sales', action: 'sale.create.fromReminder', entityId: saleId, summary: `Venta futura generada desde recordatorio por ${total}`, after: sale })
  writeState(state)
  emitMany(['sales', 'products', 'stockMovements', 'cashMovements', 'currentAccounts', 'reminders', 'auditLogs'])
  return saleId
}

export async function collectSaleTransaction(sale, input = {}) {
  const state = readState()
  const now = nowISO()
  const shift = assertRequiredOpenShift(state, input)
  const currentSale = (state.sales || []).find((item) => item.id === sale.id)
  if (!currentSale) throw new Error('La venta ya no existe.')
  if (currentSale.status === 'Anulada') throw new Error('No se puede cobrar una venta anulada.')
  if (currentSale.paid === true) throw new Error('La venta ya está cobrada.')

  const amount = numberValue(currentSale.total)
  const method = input.method || (currentSale.paymentMethod === 'Cuenta corriente' ? 'Efectivo' : currentSale.paymentMethod) || 'Efectivo'
  const cashId = idFor('cashMovements')

  state.sales = state.sales.map((item) => item.id === sale.id ? indexDocument({ ...item, paid: true, paymentStatus: 'Pagada', paymentMethod: method, paidAt: now, cashMovementId: cashId, updatedAt: now }) : item)
  state.cashMovements = [indexDocument({
    id: cashId,
    date: input.date || todayISO(),
    type: 'Ingreso',
    concept: `Cobro venta ${sale.id}`,
    method,
    amount,
    closed: false,
    status: 'Activo',
    relatedSaleId: sale.id,
    clientId: currentSale.clientId || '',
    patientId: currentSale.patientId || '',
    ...shiftPayload({ ...currentSale, ...input, ...(shift || {}) }),
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  }), ...(state.cashMovements || [])]

  if (currentSale.currentAccountId) {
    state.currentAccounts = (state.currentAccounts || []).map((item) => item.id === currentSale.currentAccountId ? indexDocument({ ...item, paidAmount: amount, status: 'Cancelado', paidAt: now, updatedAt: now }) : item)
  }

  addAudit(state, { module: 'sales', action: 'sale.collect.transaction', entityId: sale.id, summary: `Cobro de venta por ${amount}`, before: currentSale, after: { paid: true, amount, method } })
  writeState(state)
  emitMany(['sales', 'cashMovements', 'currentAccounts', 'auditLogs'])
  return sale.id
}

export async function voidSaleTransaction(sale, input = {}) {
  const state = readState()
  const now = nowISO()
  const currentSale = (state.sales || []).find((item) => item.id === sale.id)
  if (!currentSale) throw new Error('La venta ya no existe.')
  if (currentSale.status === 'Anulada') throw new Error('La venta ya estaba anulada.')
  const cash = currentSale.cashMovementId ? (state.cashMovements || []).find((item) => item.id === currentSale.cashMovementId) : null
  if (cash?.closed) throw new Error('No se puede anular una venta incluida en un cierre de caja.')

  const reversalStockMovementIds = []
  for (const saleItem of currentSale.items || []) {
    if (!saleItem.productId || currentSale.stockAffected === false) continue
    const product = (state.products || []).find((item) => item.id === saleItem.productId)
    if (!product || product.type !== 'Producto') continue
    const qty = numberValue(saleItem.qty)
    const currentStock = numberValue(product.stock)
    const movementId = idFor('stockMovements')
    reversalStockMovementIds.push(movementId)
    state.products = state.products.map((item) => item.id === product.id ? indexDocument({ ...item, stock: currentStock + qty, updatedAt: now }) : item)
    state.stockMovements = [indexDocument({
      id: movementId,
      date: input.date || todayISO(),
      productId: product.id,
      productName: saleItem.name || product.name,
      type: 'Entrada',
      source: 'Anulación de venta',
      qty,
      previousStock: currentStock,
      newStock: currentStock + qty,
      relatedSaleId: sale.id,
      notes: input.reason || 'Anulación de venta',
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.stockMovements || [])]
  }

  state.cashMovements = (state.cashMovements || []).map((item) => item.id === currentSale.cashMovementId ? indexDocument({ ...item, amount: 0, status: 'Anulado', voided: true, voidedAt: now, voidReason: input.reason || '', updatedAt: now }) : item)
  state.currentAccounts = (state.currentAccounts || []).map((item) => item.id === currentSale.currentAccountId ? indexDocument({ ...item, status: 'Anulado', voided: true, voidedAt: now, voidReason: input.reason || '', updatedAt: now }) : item)
  state.sales = state.sales.map((item) => item.id === sale.id ? indexDocument({ ...item, status: 'Anulada', paid: false, paymentStatus: 'Anulada', voided: true, voidedAt: now, voidReason: input.reason || '', reversalStockMovementIds, updatedAt: now }) : item)

  addAudit(state, { module: 'sales', action: 'sale.void.transaction', entityId: sale.id, summary: `Anulación de venta. Motivo: ${input.reason || 'Sin motivo'}`, before: currentSale, after: { status: 'Anulada', reason: input.reason || '' }, severity: 'warning' })
  writeState(state)
  emitMany(['sales', 'products', 'stockMovements', 'cashMovements', 'currentAccounts', 'auditLogs'])
  return sale.id
}

export async function createPurchaseTransaction(input) {
  const state = readState()
  const now = nowISO()
  const shift = input.paid ? assertRequiredOpenShift(state, input) : (input.shiftId ? assertOpenShift(state, input) : null)
  const product = (state.products || []).find((item) => item.id === input.productId)
  if (!product) throw new Error('El producto seleccionado ya no existe.')
  if (product.type !== 'Producto') throw new Error('Solo se puede reponer stock de productos físicos.')

  const qty = Math.max(1, numberValue(input.qty))
  const cost = numberValue(input.cost)
  const total = qty * cost
  const currentStock = numberValue(product.stock)
  const purchaseId = idFor('purchases')
  const stockMovementId = idFor('stockMovements')
  const cashId = input.paid ? idFor('cashMovements') : ''

  const purchase = indexDocument({
    id: purchaseId,
    date: input.date || todayISO(),
    supplierId: input.supplierId || '',
    supplierName: input.supplierName || '',
    productId: input.productId,
    productName: product.name,
    qty,
    cost,
    total,
    paid: input.paid === true,
    invoice: input.invoice || '',
    notes: input.notes || '',
    status: 'Activa',
    cashMovementId: cashId,
    stockMovementId,
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  })
  state.purchases = [purchase, ...(state.purchases || [])]
  state.products = (state.products || []).map((item) => item.id === product.id ? indexDocument({ ...item, stock: currentStock + qty, updatedAt: now }) : item)
  state.stockMovements = [indexDocument({
    id: stockMovementId,
    date: input.date || todayISO(),
    productId: product.id,
    productName: product.name,
    type: 'Entrada',
    source: 'Compra',
    qty,
    previousStock: currentStock,
    newStock: currentStock + qty,
    relatedPurchaseId: purchaseId,
    notes: input.invoice || input.notes || 'Reposición por compra',
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  }), ...(state.stockMovements || [])]

  if (input.paid) {
    state.cashMovements = [indexDocument({
      id: cashId,
      date: input.date || todayISO(),
      type: 'Egreso',
      concept: `Compra ${product.name}`,
      method: input.paymentMethod || 'Efectivo',
      amount: total,
      closed: false,
      status: 'Activo',
      relatedPurchaseId: purchaseId,
      supplierId: input.supplierId || '',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: now,
      updatedAt: now,
      ...actorPayload(),
    }), ...(state.cashMovements || [])]
  }

  addAudit(state, { module: 'purchases', action: 'purchase.create.transaction', entityId: purchaseId, summary: `Compra transaccional por ${total}`, after: purchase })
  writeState(state)
  emitMany(['purchases', 'products', 'stockMovements', 'cashMovements', 'auditLogs'])
  return purchaseId
}

export async function voidPurchaseTransaction(purchase, input = {}) {
  const state = readState()
  const now = nowISO()
  const currentPurchase = (state.purchases || []).find((item) => item.id === purchase.id)
  if (!currentPurchase) throw new Error('La compra ya no existe.')
  if (currentPurchase.status === 'Anulada') throw new Error('La compra ya estaba anulada.')
  const cash = currentPurchase.cashMovementId ? (state.cashMovements || []).find((item) => item.id === currentPurchase.cashMovementId) : null
  if (cash?.closed) throw new Error('No se puede anular una compra incluida en un cierre de caja.')
  const product = (state.products || []).find((item) => item.id === currentPurchase.productId)
  if (!product) throw new Error('El producto asociado ya no existe.')
  const qty = numberValue(currentPurchase.qty)
  const currentStock = numberValue(product.stock)
  if (currentStock < qty) throw new Error(`No se puede anular: stock actual ${currentStock}, compra ${qty}.`)
  const movementId = idFor('stockMovements')

  state.products = state.products.map((item) => item.id === product.id ? indexDocument({ ...item, stock: currentStock - qty, updatedAt: now }) : item)
  state.stockMovements = [indexDocument({
    id: movementId,
    date: input.date || todayISO(),
    productId: product.id,
    productName: currentPurchase.productName || product.name,
    type: 'Salida',
    source: 'Anulación de compra',
    qty: -qty,
    previousStock: currentStock,
    newStock: currentStock - qty,
    relatedPurchaseId: purchase.id,
    notes: input.reason || 'Anulación de compra',
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  }), ...(state.stockMovements || [])]
  state.cashMovements = (state.cashMovements || []).map((item) => item.id === currentPurchase.cashMovementId ? indexDocument({ ...item, amount: 0, status: 'Anulado', voided: true, voidedAt: now, voidReason: input.reason || '', updatedAt: now }) : item)
  state.purchases = state.purchases.map((item) => item.id === purchase.id ? indexDocument({ ...item, status: 'Anulada', voided: true, voidedAt: now, voidReason: input.reason || '', reversalStockMovementId: movementId, updatedAt: now }) : item)
  addAudit(state, { module: 'purchases', action: 'purchase.void.transaction', entityId: purchase.id, summary: `Anulación de compra. Motivo: ${input.reason || 'Sin motivo'}`, before: currentPurchase, after: { status: 'Anulada', reason: input.reason || '' }, severity: 'warning' })
  writeState(state)
  emitMany(['purchases', 'products', 'stockMovements', 'cashMovements', 'auditLogs'])
  return purchase.id
}

export async function collectCurrentAccountTransaction(account, input = {}) {
  const state = readState()
  const now = nowISO()
  const shift = assertRequiredOpenShift(state, input)
  const currentAccount = (state.currentAccounts || []).find((item) => item.id === account.id)
  if (!currentAccount) throw new Error('El movimiento de cuenta corriente ya no existe.')
  if (currentAccount.status === 'Anulado') throw new Error('No se puede cobrar un movimiento anulado.')
  const total = numberValue(currentAccount.amount)
  const paidBefore = numberValue(currentAccount.paidAmount)
  const payment = Math.max(1, numberValue(input.amount || (total - paidBefore)))
  if (paidBefore + payment > total) throw new Error('El importe supera el saldo pendiente.')
  const paidAfter = paidBefore + payment
  const status = paidAfter >= total ? 'Cancelado' : 'Parcial'
  const method = input.method || 'Efectivo'
  const cashId = idFor('cashMovements')

  state.currentAccounts = state.currentAccounts.map((item) => item.id === account.id ? indexDocument({ ...item, paidAmount: paidAfter, status, lastPaymentAt: now, updatedAt: now }) : item)
  state.cashMovements = [indexDocument({
    id: cashId,
    date: input.date || todayISO(),
    type: 'Ingreso',
    concept: `Pago cuenta corriente ${currentAccount.concept || account.id}`,
    method,
    amount: payment,
    closed: false,
    status: 'Activo',
    relatedCurrentAccountId: account.id,
    relatedSaleId: currentAccount.relatedSaleId || '',
    clientId: currentAccount.clientId || '',
    patientId: currentAccount.patientId || '',
    ...shiftPayload({ ...currentAccount, ...input, ...(shift || {}) }),
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  }), ...(state.cashMovements || [])]
  if (currentAccount.relatedSaleId && status === 'Cancelado') {
    state.sales = (state.sales || []).map((item) => item.id === currentAccount.relatedSaleId ? indexDocument({ ...item, paid: true, paymentStatus: 'Pagada', paymentMethod: method, cashMovementId: cashId, paidAt: now, updatedAt: now }) : item)
  }
  addAudit(state, { module: 'currentAccounts', action: 'currentAccount.collect.transaction', entityId: account.id, summary: `Pago de cuenta corriente por ${payment}`, before: currentAccount, after: { paidAmount: paidAfter, status, method } })
  writeState(state)
  emitMany(['currentAccounts', 'sales', 'cashMovements', 'auditLogs'])
  return account.id
}

export async function createCashMovementTransaction(input) {
  const state = readState()
  const now = nowISO()
  const shift = assertRequiredOpenShift(state, input)
  const amount = numberValue(input.amount)
  if (amount <= 0) throw new Error('El importe debe ser mayor a cero.')
  const id = idFor('cashMovements')
  const movement = indexDocument({
    id,
    date: input.date || todayISO(),
    type: input.type || 'Ingreso',
    concept: input.concept || '',
    method: input.method || 'Efectivo',
    amount,
    closed: false,
    status: 'Activo',
    ...shiftPayload({ ...input, ...(shift || {}) }),
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  })
  state.cashMovements = [movement, ...(state.cashMovements || [])]
  addAudit(state, { module: 'cashMovements', action: 'cashMovement.create.transaction', entityId: id, summary: `Movimiento manual de caja por ${amount}`, after: movement })
  writeState(state)
  emitMany(['cashMovements', 'auditLogs'])
  return id
}

export async function closeCashTransaction(input = {}) {
  const state = readState()
  const now = nowISO()
  if (!input.shiftId) throw new Error('Seleccioná una caja para cerrar.')
  const date = input.date || todayISO()
  const shift = assertRequiredOpenShift(state, input)
  const id = `closure_${date}_${input.shiftId}`
  if ((state.cashClosures || []).some((item) => item.id === id)) throw new Error(`Ya existe un cierre de caja para ${date}.`)
  const openMovements = (state.cashMovements || []).filter((item) => {
    if (item.closed === true || item.status === 'Anulado') return false
    return input.shiftId ? item.shiftId === input.shiftId : item.date === date
  })
  const income = openMovements.filter((item) => item.type === 'Ingreso').reduce((acc, item) => acc + numberValue(item.amount), 0)
  const expenses = openMovements.filter((item) => item.type === 'Egreso').reduce((acc, item) => acc + numberValue(item.amount), 0)
  const byMethod = openMovements.reduce((acc, item) => {
    const key = item.method || 'Sin método'
    acc[key] = (acc[key] || 0) + (item.type === 'Ingreso' ? numberValue(item.amount) : -numberValue(item.amount))
    return acc
  }, {})
  const actor = actorPayload()
  const isSharedDailyClosure = isSharedDailyCashSession({ ...input, ...(shift || {}), id: input.shiftId })
  const closure = indexDocument({
    id,
    date,
    income,
    expenses,
    net: income - expenses,
    byMethod,
    movementIds: openMovements.map((item) => item.id),
    movementCount: openMovements.length,
    status: 'Cerrado',
    closureType: isSharedDailyClosure ? 'daily' : 'shift',
    closedAt: now,
    closedBy: actor.userUid,
    closedByName: input.closedByName || actor.userEmail,
    ...shiftPayload({ ...input, ...(shift || {}) }),
    createdAt: now,
    updatedAt: now,
    ...actor,
  })
  state.cashClosures = [closure, ...(state.cashClosures || [])]
  state.cashMovements = state.cashMovements.map((item) => openMovements.some((open) => open.id === item.id) ? indexDocument({ ...item, closed: true, closureId: id, shiftClosureId: id, closedAt: now, updatedAt: now }) : item)
  if (input.shiftId) {
    state.shifts = (state.shifts || []).map((item) => item.id === input.shiftId ? indexDocument({ ...item, status: 'Cerrado', closedAt: now, closedBy: actor.userUid, closedByName: input.closedByName || actor.userEmail, shiftClosureId: id, updatedAt: now }) : item)
  }
  addAudit(state, { module: 'cashClosures', action: 'cash.shift.close.transaction', entityId: id, summary: `Cierre de caja ${date}: neto ${income - expenses}`, after: closure, severity: 'warning' })
  writeState(state)
  emitMany(['cashClosures', 'cashMovements', 'shifts', 'auditLogs'])
  return id
}

export async function closeGlobalCashTransaction(input = {}) {
  const state = readState()
  const now = nowISO()
  const date = input.date || todayISO()
  const id = `global_${date}`
  if ((state.globalCashClosures || []).some((item) => item.id === id)) throw new Error(`Ya existe un cierre del día para ${date}.`)
  const shifts = (state.shifts || []).filter((item) => item.date === date)
  const openShifts = shifts.filter((item) => isSharedDailyCashSession(item) && item.status !== 'Cerrado')
  if (openShifts.length) throw new Error('No se puede cerrar el día: hay cajas abiertas.')
  const openMovements = (state.cashMovements || []).filter((item) => item.date === date && item.closed !== true && item.status !== 'Anulado')
  if (openMovements.length) throw new Error('No se puede cerrar el día: quedan movimientos de caja abiertos o sin cierre de caja.')
  const closures = (state.cashClosures || []).filter((item) => item.date === date)
  if (!closures.length) throw new Error('No hay cierres de caja para consolidar.')
  const income = closures.reduce((acc, item) => acc + numberValue(item.income), 0)
  const expenses = closures.reduce((acc, item) => acc + numberValue(item.expenses), 0)
  const byMethod = closures.reduce((acc, item) => {
    Object.entries(item.byMethod || {}).forEach(([method, value]) => {
      acc[method] = (acc[method] || 0) + numberValue(value)
    })
    return acc
  }, {})
  const closure = indexDocument({
    id,
    date,
    income,
    expenses,
    net: income - expenses,
    byMethod,
    shiftClosureIds: closures.map((item) => item.id),
    shiftIds: shifts.map((item) => item.id),
    closureCount: closures.length,
    status: 'Cerrado',
    closedAt: now,
    closedBy: actorPayload().userUid,
    createdAt: now,
    updatedAt: now,
    ...actorPayload(),
  })
  state.globalCashClosures = [closure, ...(state.globalCashClosures || [])]
  state.cashClosures = (state.cashClosures || []).map((item) => item.date === date ? indexDocument({ ...item, globalClosureId: id, updatedAt: now }) : item)
  addAudit(state, { module: 'globalCashClosures', action: 'cash.global.close.transaction', entityId: id, summary: `Cierre del día ${date}: neto ${income - expenses}`, after: closure, severity: 'warning' })
  writeState(state)
  emitMany(['globalCashClosures', 'cashClosures', 'auditLogs'])
  return id
}
