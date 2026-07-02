import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { auth, db } from '../firebase/client.js'
import { TENANT_ID } from '../firebase/config.js'
import { seedData } from '../../data/seedData.js'
import { EXPORT_BATCH_SIZE, MAX_EXPORT_ROWS, MAX_LIST_LIMIT } from '../../config/performance.js'
import { buildSearchPayload, normalizeSearchText } from '../../utils/search.js'
import { calculateSalePricing } from '../../utils/salesPricing.js'

function assertDb() {
  if (!db) {
    throw new Error('Firebase no está inicializado. Revisá VITE_USE_FIREBASE y .env')
  }
}

function collectionRef(collectionName) {
  assertDb()
  return collection(db, 'tenants', TENANT_ID, collectionName)
}

function docRef(collectionName, id) {
  assertDb()
  return doc(db, 'tenants', TENANT_ID, collectionName, id)
}

function newDocRef(collectionName) {
  assertDb()
  return doc(collectionRef(collectionName))
}

const cleanPayload = (payload) => {
  const clean = {}
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value !== undefined) clean[key] = value
  })
  return clean
}

const numberValue = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const nowISO = () => new Date().toISOString()

function withSearchIndex(payload) {
  return cleanPayload({ ...payload, ...buildSearchPayload(payload) })
}

function actorPayload() {
  const user = auth?.currentUser
  return {
    userUid: user?.uid || 'system',
    userEmail: user?.email || 'system',
  }
}

function shiftPayload(input = {}) {
  const resolvedShiftId = input.shiftId || input.id || ''
  return {
    shiftId: resolvedShiftId,
    shiftName: input.shiftName || input.name || (resolvedShiftId ? 'Sin nombre' : 'Sin turno'),
    shiftDate: input.shiftDate || input.date || todayISO(),
    veterinarianIds: Array.isArray(input.veterinarianIds) ? input.veterinarianIds : [],
    veterinarianNames: Array.isArray(input.veterinarianNames) ? input.veterinarianNames : [],
  }
}

async function assertOpenShift(transaction, input = {}) {
  if (!input.shiftId) return null
  const ref = docRef('shifts', input.shiftId)
  const snap = await transaction.get(ref)
  if (!snap.exists()) throw new Error('El turno seleccionado ya no existe.')
  const shift = snap.data()
  if (shift.status === 'Cerrado') throw new Error('No se puede operar sobre un turno cerrado.')
  return { id: snap.id, ...shift }
}

async function assertUserCanOperateShift(transaction, shift) {
  const actor = actorPayload()
  if (!shift?.id) throw new Error('Seleccioná un turno de caja abierto.')
  if (!actor.userUid || actor.userUid === 'system') return shift

  const profileSnap = await transaction.get(docRef('users', actor.userUid))
  if (!profileSnap.exists()) throw new Error('Tu usuario no tiene perfil interno para operar caja.')
  const profile = profileSnap.data()
  if (profile.active !== true) throw new Error('Tu usuario no está habilitado para operar caja.')
  if (profile.role === 'admin') return shift

  const assignedIds = Array.isArray(shift.veterinarianIds) ? shift.veterinarianIds : []
  if (!assignedIds.includes(actor.userUid) && !assignedIds.includes(profile.email)) {
    throw new Error('Tu usuario no está asignado al turno de caja seleccionado.')
  }

  return shift
}

async function assertRequiredOpenShift(transaction, input = {}) {
  if (!input.shiftId) throw new Error('Seleccioná un turno de caja abierto antes de operar.')
  const shift = await assertOpenShift(transaction, input)
  return assertUserCanOperateShift(transaction, shift)
}

function auditPayload({ module, action, entityId, summary, before = null, after = null, severity = 'info' }) {
  const actor = actorPayload()
  return withSearchIndex({
    ...actor,
    module,
    action,
    entityId,
    summary,
    severity,
    before,
    after,
    createdAt: serverTimestamp(),
    createdAtISO: nowISO(),
  })
}

function setAudit(batchOrTransaction, payload) {
  const ref = newDocRef('auditLogs')
  batchOrTransaction.set(ref, payload)
  return ref.id
}

function safeLimit(value) {
  return Math.min(Math.max(Number(value || MAX_LIST_LIMIT), 1), MAX_LIST_LIMIT)
}

function buildCollectionConstraints(options = {}, { includeLimit = true } = {}) {
  const constraints = []
  const normalizedTerm = normalizeSearchText(options.searchTerm)

  if (Array.isArray(options.where)) {
    options.where.forEach((filter) => {
      if (filter?.field && filter?.op && filter.value !== undefined && filter.value !== '') {
        constraints.push(where(filter.field, filter.op, filter.value))
      }
    })
  }

  if (normalizedTerm) {
    constraints.push(where('searchTokens', 'array-contains', normalizedTerm))
  }

  if (options.orderByField) {
    constraints.push(orderBy(options.orderByField, options.orderDirection === 'asc' ? 'asc' : 'desc'))
  }

  if (options.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc))
  }

  if (includeLimit) {
    constraints.push(limit(safeLimit(options.limitCount)))
  }

  return constraints
}

function buildCollectionQuery(collectionName, options = {}) {
  return query(collectionRef(collectionName), ...buildCollectionConstraints(options))
}

export async function fetchCollectionPage(collectionName, options = {}) {
  const snapshot = await getDocs(buildCollectionQuery(collectionName, options))
  const rows = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  const pageSize = safeLimit(options.limitCount)

  return {
    rows,
    lastDoc: snapshot.docs.at(-1) || null,
    firstDoc: snapshot.docs[0] || null,
    hasMore: snapshot.docs.length === pageSize,
    pageSize,
  }
}

export async function fetchCollectionForExport(collectionName, options = {}) {
  const rows = []
  let startAfterDoc = null
  let hasMore = true

  while (hasMore && rows.length < MAX_EXPORT_ROWS) {
    const limitCount = Math.min(EXPORT_BATCH_SIZE, MAX_EXPORT_ROWS - rows.length)
    const result = await fetchCollectionPage(collectionName, {
      ...options,
      startAfterDoc,
      limitCount,
    })
    rows.push(...(result.rows || []))
    startAfterDoc = result.lastDoc
    hasMore = Boolean(result.hasMore && result.lastDoc)
  }

  return { rows, truncated: hasMore, maxRows: MAX_EXPORT_ROWS }
}

export async function getCollectionCount(collectionName, options = {}) {
  const constraints = []
  const normalizedTerm = normalizeSearchText(options.searchTerm)

  if (Array.isArray(options.where)) {
    options.where.forEach((filter) => {
      if (filter?.field && filter?.op && filter.value !== undefined && filter.value !== '') {
        constraints.push(where(filter.field, filter.op, filter.value))
      }
    })
  }

  if (normalizedTerm) {
    constraints.push(where('searchTokens', 'array-contains', normalizedTerm))
  }

  const snapshot = await getCountFromServer(query(collectionRef(collectionName), ...constraints))
  return snapshot.data().count || 0
}

export function subscribeCollection(collectionName, callback, onError, options = {}) {
  let cancelled = false

  fetchCollectionPage(collectionName, options)
    .then((result) => {
      if (!cancelled) callback(Array.isArray(result?.rows) ? result.rows : [])
    })
    .catch((error) => {
      if (!cancelled) onError?.(error)
    })

  return () => {
    cancelled = true
  }
}

export async function createDocument(collectionName, payload) {
  const now = serverTimestamp()
  const ref = newDocRef(collectionName)
  const data = withSearchIndex({ ...payload, createdAt: now, updatedAt: now })
  const batch = writeBatch(db)
  batch.set(ref, data)
  if (collectionName !== 'auditLogs') {
    setAudit(batch, auditPayload({
      module: collectionName,
      action: 'create',
      entityId: ref.id,
      summary: `Creación de registro en ${collectionName}`,
      after: cleanPayload(payload),
    }))
  }
  await batch.commit()
  return ref.id
}

export async function setDocument(collectionName, id, payload) {
  const now = serverTimestamp()
  const ref = docRef(collectionName, id)
  const previous = await getDoc(ref)
  const data = withSearchIndex({ ...payload, updatedAt: now })
  const batch = writeBatch(db)
  batch.set(ref, data, { merge: true })
  if (collectionName !== 'auditLogs') {
    setAudit(batch, auditPayload({
      module: collectionName,
      action: previous.exists() ? 'set' : 'create',
      entityId: id,
      summary: `${previous.exists() ? 'Actualización' : 'Creación'} de registro en ${collectionName}`,
      before: previous.exists() ? previous.data() : null,
      after: cleanPayload(payload),
    }))
  }
  await batch.commit()
  return id
}

export async function updateDocument(collectionName, id, payload) {
  const ref = docRef(collectionName, id)
  const previous = await getDoc(ref)
  const data = withSearchIndex({ ...payload, updatedAt: serverTimestamp() })
  const batch = writeBatch(db)
  batch.update(ref, data)
  if (collectionName !== 'auditLogs') {
    setAudit(batch, auditPayload({
      module: collectionName,
      action: 'update',
      entityId: id,
      summary: `Actualización de registro en ${collectionName}`,
      before: previous.exists() ? previous.data() : null,
      after: cleanPayload(payload),
    }))
  }
  await batch.commit()
  return id
}

export async function deleteDocument(collectionName, id) {
  const ref = docRef(collectionName, id)
  const previous = await getDoc(ref)
  const batch = writeBatch(db)
  batch.delete(ref)
  if (collectionName !== 'auditLogs') {
    setAudit(batch, auditPayload({
      module: collectionName,
      action: 'delete',
      entityId: id,
      summary: `Eliminación de registro en ${collectionName}`,
      before: previous.exists() ? previous.data() : null,
      severity: 'warning',
    }))
  }
  await batch.commit()
  return id
}

export async function seedDemoData({ overwrite = false } = {}) {
  assertDb()
  const batch = writeBatch(db)

  for (const [collectionName, documents] of Object.entries(seedData)) {
    if (!overwrite) {
      const existing = await getDocs(query(collectionRef(collectionName), limit(1)))
      if (!existing.empty) continue
    }

    documents.forEach((item) => {
      const { id, ...payload } = item
      batch.set(docRef(collectionName, id), withSearchIndex({
        ...payload,
        seeded: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }))
    })
  }

  await batch.commit()
}

export async function createSaleTransaction(input) {
  assertDb()
  const saleRef = newDocRef('sales')
  const cashRef = input.paymentMethod !== 'Cuenta corriente' && input.paid ? newDocRef('cashMovements') : null
  const accountRef = input.paymentMethod === 'Cuenta corriente' || !input.paid ? newDocRef('currentAccounts') : null
  const stockMovementRef = newDocRef('stockMovements')

  await runTransaction(db, async (transaction) => {
    const shift = await assertRequiredOpenShift(transaction, input)
    const productRef = docRef('products', input.productId)
    const productSnap = await transaction.get(productRef)
    if (!productSnap.exists()) throw new Error('El producto seleccionado ya no existe.')
    const product = productSnap.data()
    if (product.active === false) throw new Error('El producto seleccionado está inactivo.')

    const qty = Math.max(1, numberValue(input.qty))
    const unitPrice = numberValue(product.price)
    const subtotal = qty * unitPrice
    const pricing = calculateSalePricing({
      subtotal,
      paymentMethod: input.paymentMethod,
      creditSurchargePercent: input.creditSurchargePercent,
    })
    const total = pricing.total
    const isStockProduct = product.type === 'Producto'
    const currentStock = numberValue(product.stock)

    if (isStockProduct && currentStock < qty) {
      throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${currentStock}.`)
    }

    const paid = input.paymentMethod !== 'Cuenta corriente' && input.paid === true
    const item = {
      productId: productSnap.id,
      name: product.name,
      qty,
      price: unitPrice,
      cost: numberValue(product.cost),
      type: product.type || 'Producto',
    }

    const salePayload = withSearchIndex({
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
      cashMovementId: cashRef?.id || '',
      currentAccountId: accountRef?.id || '',
      stockMovementIds: isStockProduct ? [stockMovementRef.id] : [],
      stockAffected: isStockProduct,
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    })

    transaction.set(saleRef, salePayload)

    if (isStockProduct) {
      transaction.update(productRef, {
        stock: currentStock - qty,
        updatedAt: serverTimestamp(),
      })
      transaction.set(stockMovementRef, withSearchIndex({
        date: input.date || todayISO(),
        productId: productSnap.id,
        productName: product.name,
        type: 'Salida',
        source: 'Venta',
        qty: -qty,
        previousStock: currentStock,
        newStock: currentStock - qty,
        relatedSaleId: saleRef.id,
        notes: `Venta ${saleRef.id}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    if (cashRef) {
      transaction.set(cashRef, withSearchIndex({
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
        relatedSaleId: saleRef.id,
        clientId: input.clientId || '',
        patientId: input.patientId || '',
        clientName: input.clientName || '',
        patientName: input.patientName || '',
        ...shiftPayload({ ...input, ...(shift || {}) }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    if (accountRef) {
      transaction.set(accountRef, withSearchIndex({
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
        relatedSaleId: saleRef.id,
        notes: input.notes || '',
        ...shiftPayload({ ...input, ...(shift || {}) }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    setAudit(transaction, auditPayload({
      module: 'sales',
      action: 'sale.create.transaction',
      entityId: saleRef.id,
      summary: `Venta transaccional por ${total}`,
      after: { ...salePayload, id: saleRef.id },
    }))
  })

  return saleRef.id
}


export async function createReminderSaleTransaction(input) {
  assertDb()
  const saleRef = newDocRef('sales')
  const reminderRef = input.reminderId ? docRef('reminders', input.reminderId) : null
  const cashRef = input.paymentMethod !== 'Cuenta corriente' && input.paid ? newDocRef('cashMovements') : null
  const accountRef = input.paymentMethod === 'Cuenta corriente' || !input.paid ? newDocRef('currentAccounts') : null

  await runTransaction(db, async (transaction) => {
    const shift = await assertRequiredOpenShift(transaction, input)
    const productRef = input.productId ? docRef('products', input.productId) : null
    const productSnap = productRef ? await transaction.get(productRef) : null
    const product = productSnap?.exists() ? productSnap.data() : null

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
    const shouldAffectStock = Boolean(input.stockAffected && productRef && product?.type === 'Producto')
    const stockMovementRef = shouldAffectStock ? newDocRef('stockMovements') : null
    const currentStock = numberValue(product?.stock)

    if (input.stockAffected && !productRef) {
      throw new Error('Para afectar stock, seleccioná un producto registrado.')
    }

    if (shouldAffectStock && currentStock < qty) {
      throw new Error(`Stock insuficiente para ${productName}. Disponible: ${currentStock}.`)
    }

    const item = {
      productId: productSnap?.id || '',
      name: productName,
      qty,
      price: unitPrice,
      cost: numberValue(product?.cost),
      type: product?.type || 'Producto manual',
    }

    const salePayload = withSearchIndex({
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
      origin: 'recordatorio',
      sourceReminderId: input.reminderId || '',
      cashMovementId: cashRef?.id || '',
      currentAccountId: accountRef?.id || '',
      stockMovementIds: stockMovementRef ? [stockMovementRef.id] : [],
      stockAffected: shouldAffectStock,
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    })

    transaction.set(saleRef, salePayload)

    if (shouldAffectStock) {
      transaction.update(productRef, {
        stock: currentStock - qty,
        updatedAt: serverTimestamp(),
      })
      transaction.set(stockMovementRef, withSearchIndex({
        date: input.date || todayISO(),
        productId: productSnap.id,
        productName,
        type: 'Salida',
        source: 'Venta desde recordatorio',
        qty: -qty,
        previousStock: currentStock,
        newStock: currentStock - qty,
        relatedSaleId: saleRef.id,
        relatedReminderId: input.reminderId || '',
        notes: `Venta ${saleRef.id} generada desde recordatorio`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    if (cashRef) {
      transaction.set(cashRef, withSearchIndex({
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
        relatedSaleId: saleRef.id,
        relatedReminderId: input.reminderId || '',
        clientId: input.clientId || '',
        patientId: input.patientId || '',
        clientName: input.clientName || '',
        patientName: input.patientName || '',
        ...shiftPayload({ ...input, ...(shift || {}) }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    if (accountRef) {
      transaction.set(accountRef, withSearchIndex({
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
        relatedSaleId: saleRef.id,
        relatedReminderId: input.reminderId || '',
        notes: input.notes || '',
        ...shiftPayload({ ...input, ...(shift || {}) }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    if (reminderRef) {
      transaction.set(reminderRef, withSearchIndex({
        status: paid ? 'Venta cargada' : 'Venta pendiente',
        saleGenerated: true,
        relatedSaleId: saleRef.id,
        saleGeneratedAt: serverTimestamp(),
        stockAffectedOnSale: shouldAffectStock,
        updatedAt: serverTimestamp(),
      }), { merge: true })
    }

    setAudit(transaction, auditPayload({
      module: 'sales',
      action: 'sale.create.fromReminder',
      entityId: saleRef.id,
      summary: `Venta futura generada desde recordatorio por ${total}`,
      after: { ...salePayload, id: saleRef.id },
    }))
  })

  return saleRef.id
}

export async function collectSaleTransaction(sale, input = {}) {
  assertDb()
  if (!sale?.id) throw new Error('Venta inválida.')
  const cashRef = newDocRef('cashMovements')
  const saleRef = docRef('sales', sale.id)
  const accountRef = sale.currentAccountId ? docRef('currentAccounts', sale.currentAccountId) : null

  await runTransaction(db, async (transaction) => {
    const shift = await assertRequiredOpenShift(transaction, input)
    const saleSnap = await transaction.get(saleRef)
    if (!saleSnap.exists()) throw new Error('La venta ya no existe.')
    const currentSale = saleSnap.data()
    if (currentSale.status === 'Anulada') throw new Error('No se puede cobrar una venta anulada.')
    if (currentSale.paid === true) throw new Error('La venta ya está cobrada.')

    const accountSnap = accountRef ? await transaction.get(accountRef) : null
    const amount = numberValue(currentSale.total)
    const method = input.method || (currentSale.paymentMethod === 'Cuenta corriente' ? 'Efectivo' : currentSale.paymentMethod) || 'Efectivo'

    transaction.update(saleRef, withSearchIndex({
      paid: true,
      paymentStatus: 'Pagada',
      paymentMethod: method,
      paidAt: serverTimestamp(),
      cashMovementId: cashRef.id,
      updatedAt: serverTimestamp(),
    }))

    transaction.set(cashRef, withSearchIndex({
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
      clientName: currentSale.clientName || '',
      patientName: currentSale.patientName || '',
      ...shiftPayload({ ...currentSale, ...input, ...(shift || {}) }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    }))

    if (accountRef && accountSnap?.exists()) {
      transaction.update(accountRef, withSearchIndex({
        paidAmount: amount,
        status: 'Cancelado',
        paidAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }))
    }

    setAudit(transaction, auditPayload({
      module: 'sales',
      action: 'sale.collect.transaction',
      entityId: sale.id,
      summary: `Cobro de venta por ${amount}`,
      before: currentSale,
      after: { paid: true, amount, method },
    }))
  })

  return sale.id
}

export async function voidSaleTransaction(sale, input = {}) {
  assertDb()
  if (!sale?.id) throw new Error('Venta inválida.')
  const saleRef = docRef('sales', sale.id)

  await runTransaction(db, async (transaction) => {
    const saleSnap = await transaction.get(saleRef)
    if (!saleSnap.exists()) throw new Error('La venta ya no existe.')
    const currentSale = saleSnap.data()
    if (currentSale.status === 'Anulada') throw new Error('La venta ya estaba anulada.')

    const cashRef = currentSale.cashMovementId ? docRef('cashMovements', currentSale.cashMovementId) : null
    const accountRef = currentSale.currentAccountId ? docRef('currentAccounts', currentSale.currentAccountId) : null
    const cashSnap = cashRef ? await transaction.get(cashRef) : null
    const accountSnap = accountRef ? await transaction.get(accountRef) : null

    if (cashSnap?.exists() && cashSnap.data().closed === true) {
      throw new Error('No se puede anular una venta incluida en un cierre de caja.')
    }

    const reversalStockMovementIds = []
    for (const item of currentSale.items || []) {
      if (!item.productId || currentSale.stockAffected === false) continue
      const productRef = docRef('products', item.productId)
      const productSnap = await transaction.get(productRef)
      if (!productSnap.exists()) continue
      const product = productSnap.data()
      if (product.type !== 'Producto') continue
      const qty = numberValue(item.qty)
      const currentStock = numberValue(product.stock)
      const movementRef = newDocRef('stockMovements')
      reversalStockMovementIds.push(movementRef.id)
      transaction.update(productRef, { stock: currentStock + qty, updatedAt: serverTimestamp() })
      transaction.set(movementRef, withSearchIndex({
        date: input.date || todayISO(),
        productId: item.productId,
        productName: item.name || product.name,
        type: 'Entrada',
        source: 'Anulación de venta',
        qty,
        previousStock: currentStock,
        newStock: currentStock + qty,
        relatedSaleId: sale.id,
        notes: input.reason || 'Anulación de venta',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    if (cashRef && cashSnap?.exists()) {
      transaction.update(cashRef, withSearchIndex({
        amount: 0,
        status: 'Anulado',
        voided: true,
        voidedAt: serverTimestamp(),
        voidReason: input.reason || '',
        updatedAt: serverTimestamp(),
      }))
    }

    if (accountRef && accountSnap?.exists()) {
      transaction.update(accountRef, withSearchIndex({
        status: 'Anulado',
        voided: true,
        voidedAt: serverTimestamp(),
        voidReason: input.reason || '',
        updatedAt: serverTimestamp(),
      }))
    }

    transaction.update(saleRef, withSearchIndex({
      status: 'Anulada',
      paid: false,
      paymentStatus: 'Anulada',
      voided: true,
      voidedAt: serverTimestamp(),
      voidReason: input.reason || '',
      reversalStockMovementIds,
      updatedAt: serverTimestamp(),
    }))

    setAudit(transaction, auditPayload({
      module: 'sales',
      action: 'sale.void.transaction',
      entityId: sale.id,
      summary: `Anulación de venta. Motivo: ${input.reason || 'Sin motivo'}`,
      before: currentSale,
      after: { status: 'Anulada', reason: input.reason || '' },
      severity: 'warning',
    }))
  })

  return sale.id
}

export async function createPurchaseTransaction(input) {
  assertDb()
  const purchaseRef = newDocRef('purchases')
  const stockMovementRef = newDocRef('stockMovements')
  const cashRef = input.paid ? newDocRef('cashMovements') : null

  await runTransaction(db, async (transaction) => {
    const shift = input.paid ? await assertRequiredOpenShift(transaction, input) : (input.shiftId ? await assertOpenShift(transaction, input) : null)
    const productRef = docRef('products', input.productId)
    const productSnap = await transaction.get(productRef)
    if (!productSnap.exists()) throw new Error('El producto seleccionado ya no existe.')
    const product = productSnap.data()
    if (product.type !== 'Producto') throw new Error('Solo se puede reponer stock de productos físicos.')

    const qty = Math.max(1, numberValue(input.qty))
    const cost = numberValue(input.cost)
    const total = qty * cost
    const currentStock = numberValue(product.stock)

    const purchasePayload = withSearchIndex({
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
      cashMovementId: cashRef?.id || '',
      stockMovementId: stockMovementRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    })

    transaction.set(purchaseRef, purchasePayload)
    transaction.update(productRef, { stock: currentStock + qty, updatedAt: serverTimestamp() })
    transaction.set(stockMovementRef, withSearchIndex({
      date: input.date || todayISO(),
      productId: input.productId,
      productName: product.name,
      type: 'Entrada',
      source: 'Compra',
      qty,
      previousStock: currentStock,
      newStock: currentStock + qty,
      relatedPurchaseId: purchaseRef.id,
      notes: input.invoice || input.notes || 'Reposición por compra',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    }))

    if (cashRef) {
      transaction.set(cashRef, withSearchIndex({
        date: input.date || todayISO(),
        type: 'Egreso',
        concept: `Compra ${product.name}`,
        method: input.paymentMethod || 'Efectivo',
        amount: total,
        closed: false,
        status: 'Activo',
        relatedPurchaseId: purchaseRef.id,
        supplierId: input.supplierId || '',
        ...shiftPayload({ ...input, ...(shift || {}) }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...actorPayload(),
      }))
    }

    setAudit(transaction, auditPayload({
      module: 'purchases',
      action: 'purchase.create.transaction',
      entityId: purchaseRef.id,
      summary: `Compra transaccional por ${total}`,
      after: { ...purchasePayload, id: purchaseRef.id },
    }))
  })

  return purchaseRef.id
}

export async function voidPurchaseTransaction(purchase, input = {}) {
  assertDb()
  if (!purchase?.id) throw new Error('Compra inválida.')
  const purchaseRef = docRef('purchases', purchase.id)

  await runTransaction(db, async (transaction) => {
    const purchaseSnap = await transaction.get(purchaseRef)
    if (!purchaseSnap.exists()) throw new Error('La compra ya no existe.')
    const currentPurchase = purchaseSnap.data()
    if (currentPurchase.status === 'Anulada') throw new Error('La compra ya estaba anulada.')

    const cashRef = currentPurchase.cashMovementId ? docRef('cashMovements', currentPurchase.cashMovementId) : null
    const cashSnap = cashRef ? await transaction.get(cashRef) : null
    if (cashSnap?.exists() && cashSnap.data().closed === true) {
      throw new Error('No se puede anular una compra incluida en un cierre de caja.')
    }

    const productRef = docRef('products', currentPurchase.productId)
    const productSnap = await transaction.get(productRef)
    if (!productSnap.exists()) throw new Error('El producto asociado ya no existe.')
    const product = productSnap.data()
    const qty = numberValue(currentPurchase.qty)
    const currentStock = numberValue(product.stock)
    if (currentStock < qty) {
      throw new Error(`No se puede anular: el stock actual (${currentStock}) es menor a la cantidad de la compra (${qty}).`)
    }

    const stockMovementRef = newDocRef('stockMovements')
    transaction.update(productRef, { stock: currentStock - qty, updatedAt: serverTimestamp() })
    transaction.set(stockMovementRef, withSearchIndex({
      date: input.date || todayISO(),
      productId: currentPurchase.productId,
      productName: currentPurchase.productName || product.name,
      type: 'Salida',
      source: 'Anulación de compra',
      qty: -qty,
      previousStock: currentStock,
      newStock: currentStock - qty,
      relatedPurchaseId: purchase.id,
      notes: input.reason || 'Anulación de compra',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    }))

    if (cashRef && cashSnap?.exists()) {
      transaction.update(cashRef, withSearchIndex({
        amount: 0,
        status: 'Anulado',
        voided: true,
        voidedAt: serverTimestamp(),
        voidReason: input.reason || '',
        updatedAt: serverTimestamp(),
      }))
    }

    transaction.update(purchaseRef, withSearchIndex({
      status: 'Anulada',
      voided: true,
      voidedAt: serverTimestamp(),
      voidReason: input.reason || '',
      reversalStockMovementId: stockMovementRef.id,
      updatedAt: serverTimestamp(),
    }))

    setAudit(transaction, auditPayload({
      module: 'purchases',
      action: 'purchase.void.transaction',
      entityId: purchase.id,
      summary: `Anulación de compra. Motivo: ${input.reason || 'Sin motivo'}`,
      before: currentPurchase,
      after: { status: 'Anulada', reason: input.reason || '' },
      severity: 'warning',
    }))
  })

  return purchase.id
}

export async function collectCurrentAccountTransaction(account, input = {}) {
  assertDb()
  if (!account?.id) throw new Error('Cuenta corriente inválida.')
  const accountRef = docRef('currentAccounts', account.id)
  const cashRef = newDocRef('cashMovements')
  const saleRef = account.relatedSaleId ? docRef('sales', account.relatedSaleId) : null

  await runTransaction(db, async (transaction) => {
    const shift = await assertRequiredOpenShift(transaction, input)
    const accountSnap = await transaction.get(accountRef)
    if (!accountSnap.exists()) throw new Error('El movimiento de cuenta corriente ya no existe.')
    const currentAccount = accountSnap.data()
    if (currentAccount.status === 'Anulado') throw new Error('No se puede cobrar un movimiento anulado.')

    const total = numberValue(currentAccount.amount)
    const paidBefore = numberValue(currentAccount.paidAmount)
    const payment = Math.max(1, numberValue(input.amount || (total - paidBefore)))
    if (paidBefore + payment > total) throw new Error('El importe supera el saldo pendiente.')

    const paidAfter = paidBefore + payment
    const status = paidAfter >= total ? 'Cancelado' : 'Parcial'
    const method = input.method || 'Efectivo'

    transaction.update(accountRef, withSearchIndex({
      paidAmount: paidAfter,
      status,
      lastPaymentAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))

    transaction.set(cashRef, withSearchIndex({
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    }))

    if (saleRef && status === 'Cancelado') {
      const saleSnap = await transaction.get(saleRef)
      if (saleSnap.exists() && saleSnap.data().status !== 'Anulada') {
        transaction.update(saleRef, withSearchIndex({
          paid: true,
          paymentStatus: 'Pagada',
          paymentMethod: method,
          cashMovementId: cashRef.id,
          paidAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }))
      }
    }

    setAudit(transaction, auditPayload({
      module: 'currentAccounts',
      action: 'currentAccount.collect.transaction',
      entityId: account.id,
      summary: `Pago de cuenta corriente por ${payment}`,
      before: currentAccount,
      after: { paidAmount: paidAfter, status, method },
    }))
  })

  return account.id
}

export async function createCashMovementTransaction(input) {
  assertDb()
  const movementRef = newDocRef('cashMovements')
  await runTransaction(db, async (transaction) => {
    const shift = await assertRequiredOpenShift(transaction, input)
    const amount = numberValue(input.amount)
    if (amount <= 0) throw new Error('El importe debe ser mayor a cero.')
    const payload = withSearchIndex({
      date: input.date || todayISO(),
      type: input.type || 'Ingreso',
      concept: input.concept || '',
      method: input.method || 'Efectivo',
      amount,
      closed: false,
      status: 'Activo',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    })
    transaction.set(movementRef, payload)
    setAudit(transaction, auditPayload({
      module: 'cashMovements',
      action: 'cashMovement.create.transaction',
      entityId: movementRef.id,
      summary: `Movimiento manual de caja por ${amount}`,
      after: { ...payload, id: movementRef.id },
    }))
  })
  return movementRef.id
}

export async function closeCashTransaction(input = {}) {
  assertDb()
  if (!input.shiftId) throw new Error('Seleccioná un turno de caja para cerrar.')
  const date = input.date || todayISO()
  const openConstraints = [where('closed', '==', false), where('shiftId', '==', input.shiftId)]
  openConstraints.push(limit(450))
  const openQuery = query(collectionRef('cashMovements'), ...openConstraints)
  const openSnapshot = await getDocs(openQuery)
  if (openSnapshot.empty) throw new Error('No hay movimientos abiertos para cerrar.')
  if (openSnapshot.size >= 450) throw new Error('Hay demasiados movimientos abiertos. Cerrá por tandas o pedí una versión con cierre server-side.')

  const closureRef = docRef('cashClosures', `closure_${date}_${input.shiftId}`)

  await runTransaction(db, async (transaction) => {
    const shift = await assertRequiredOpenShift(transaction, input)
    const closureSnap = await transaction.get(closureRef)
    if (closureSnap.exists()) throw new Error(`Ya existe un cierre de caja para ${date}.`)

    const movementDocs = []
    for (const snap of openSnapshot.docs) {
      const latest = await transaction.get(docRef('cashMovements', snap.id))
      if (latest.exists() && latest.data().closed !== true && latest.data().status !== 'Anulado') {
        movementDocs.push({ id: latest.id, ...latest.data() })
      }
    }

    if (movementDocs.length === 0) throw new Error('Los movimientos abiertos ya fueron cerrados por otra operación.')

    const income = movementDocs
      .filter((item) => item.type === 'Ingreso')
      .reduce((acc, item) => acc + numberValue(item.amount), 0)
    const expenses = movementDocs
      .filter((item) => item.type === 'Egreso')
      .reduce((acc, item) => acc + numberValue(item.amount), 0)
    const byMethod = movementDocs.reduce((acc, item) => {
      const key = item.method || 'Sin método'
      acc[key] = (acc[key] || 0) + (item.type === 'Ingreso' ? numberValue(item.amount) : -numberValue(item.amount))
      return acc
    }, {})

    transaction.set(closureRef, withSearchIndex({
      date,
      income,
      expenses,
      net: income - expenses,
      byMethod,
      movementIds: movementDocs.map((item) => item.id),
      movementCount: movementDocs.length,
      status: 'Cerrado',
      closureType: 'shift',
      ...shiftPayload({ ...input, ...(shift || {}) }),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    }))

    movementDocs.forEach((item) => {
      transaction.update(docRef('cashMovements', item.id), {
        closed: true,
        closureId: closureRef.id,
        shiftClosureId: closureRef.id,
        closedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })

    setAudit(transaction, auditPayload({
      module: 'cashClosures',
      action: 'cash.shift.close.transaction',
      entityId: closureRef.id,
      summary: `Cierre de caja ${date}: neto ${income - expenses}`,
      after: { income, expenses, net: income - expenses, movementCount: movementDocs.length },
      severity: 'warning',
    }))

    if (input.shiftId) {
      transaction.update(docRef('shifts', input.shiftId), {
        status: 'Cerrado',
        closedAt: serverTimestamp(),
        closedBy: actorPayload().userUid,
        shiftClosureId: closureRef.id,
        updatedAt: serverTimestamp(),
      })
    }
  })

  return closureRef.id
}

export async function closeGlobalCashTransaction(input = {}) {
  assertDb()
  const date = input.date || todayISO()
  const closuresSnapshot = await getDocs(query(collectionRef('cashClosures'), where('date', '==', date), limit(50)))
  const shiftSnapshot = await getDocs(query(collectionRef('shifts'), where('date', '==', date), limit(50)))
  const closures = closuresSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  const shifts = shiftSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
  const openShifts = shifts.filter((item) => item.status !== 'Cerrado')
  if (openShifts.length) throw new Error('No se puede cerrar el día: hay turnos de caja abiertos.')

  const openMovementsSnapshot = await getDocs(query(collectionRef('cashMovements'), where('date', '==', date), where('closed', '==', false), limit(450)))
  const openMovements = openMovementsSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.status !== 'Anulado')
  if (openMovements.length) throw new Error('No se puede cerrar el día: quedan movimientos de caja abiertos o sin cierre de turno.')
  if (!closures.length) throw new Error('No hay cierres de turno para consolidar.')

  const closureRef = docRef('globalCashClosures', `global_${date}`)
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(closureRef)
    if (existing.exists()) throw new Error(`Ya existe un cierre global para ${date}.`)
    const income = closures.reduce((acc, item) => acc + numberValue(item.income), 0)
    const expenses = closures.reduce((acc, item) => acc + numberValue(item.expenses), 0)
    const byMethod = closures.reduce((acc, item) => {
      Object.entries(item.byMethod || {}).forEach(([method, value]) => {
        acc[method] = (acc[method] || 0) + numberValue(value)
      })
      return acc
    }, {})
    transaction.set(closureRef, withSearchIndex({
      date,
      income,
      expenses,
      net: income - expenses,
      byMethod,
      shiftClosureIds: closures.map((item) => item.id),
      shiftIds: shifts.map((item) => item.id),
      closureCount: closures.length,
      status: 'Cerrado',
      closedAt: serverTimestamp(),
      closedBy: actorPayload().userUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...actorPayload(),
    }))
    closures.forEach((closure) => {
      transaction.update(docRef('cashClosures', closure.id), {
        globalClosureId: closureRef.id,
        updatedAt: serverTimestamp(),
      })
    })
    setAudit(transaction, auditPayload({
      module: 'globalCashClosures',
      action: 'cash.global.close.transaction',
      entityId: closureRef.id,
      summary: `Cierre global ${date}: neto ${income - expenses}`,
      after: { income, expenses, net: income - expenses, closureCount: closures.length },
      severity: 'warning',
    }))
  })
  return closureRef.id
}
