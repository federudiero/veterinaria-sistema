export function withClientPatientLookupFields(payload = {}, lookups = {}) {
  const clientId = payload.clientId || lookups.patientById?.[payload.patientId]?.clientId || ''
  const patient = payload.patientId ? lookups.patientById?.[payload.patientId] : null
  const client = clientId ? lookups.clientById?.[clientId] : null

  return {
    ...payload,
    clientId: payload.clientId || clientId,
    clientName: payload.clientName || lookups.clientMap?.[clientId] || client?.name || '',
    clientPhone: payload.clientPhone || client?.phone || '',
    clientEmail: payload.clientEmail || client?.email || '',
    patientName: payload.patientName || lookups.patientMap?.[payload.patientId] || patient?.name || '',
    patientSpecies: payload.patientSpecies || patient?.species || '',
    patientBreed: payload.patientBreed || patient?.breed || '',
  }
}

export function withSupplierLookupFields(payload = {}, lookups = {}) {
  const supplier = payload.supplierId ? lookups.supplierById?.[payload.supplierId] : null
  return {
    ...payload,
    supplierName: payload.supplierName || lookups.supplierMap?.[payload.supplierId] || supplier?.name || '',
    supplierPhone: payload.supplierPhone || supplier?.phone || '',
    supplierEmail: payload.supplierEmail || supplier?.email || '',
  }
}

export function withProductLookupFields(payload = {}, lookups = {}) {
  const product = payload.productId ? lookups.productById?.[payload.productId] : null
  return {
    ...payload,
    productName: payload.productName || lookups.productMap?.[payload.productId] || product?.name || '',
    productSku: payload.productSku || product?.sku || '',
    productCategory: payload.productCategory || product?.category || '',
  }
}
