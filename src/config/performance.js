export const DEFAULT_LIST_LIMIT = 120
export const MAX_LIST_LIMIT = 1200
export const EXPORT_BATCH_SIZE = 300
export const MAX_EXPORT_ROWS = 2000
export const DEFAULT_PAGE_SIZE = 25
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export const COLLECTION_SEARCH_FIELDS = {
  clients: ['name', 'dni', 'phone', 'email', 'address', 'city', 'segment', 'notes'],
  patients: ['name', 'species', 'breed', 'chip', 'allergies', 'alerts', 'status'],
  clinicalRecords: ['type', 'professional', 'reason', 'diagnosis', 'treatment', 'notes'],
  appointments: ['date', 'time', 'service', 'professional', 'status', 'notes'],
  waitingQueue: ['service', 'priority', 'professional', 'status', 'notes'],
  products: ['sku', 'name', 'category', 'type', 'unit'],
  sales: ['date', 'paymentMethod', 'notes', 'receiptNumber'],
  cashMovements: ['date', 'type', 'concept', 'method'],
  cashClosures: ['date'],
  globalCashClosures: ['date', 'status'],
  shifts: ['date', 'name', 'status', 'notes'],
  suppliers: ['name', 'cuit', 'phone', 'email', 'address', 'notes'],
  purchases: ['date', 'invoice', 'notes'],
  futurePurchases: ['date', 'neededDate', 'clientName', 'productName', 'status', 'supplierName', 'notes'],
  boarding: ['room', 'status', 'feeding', 'medication', 'notes'],
  memberships: ['plan', 'status', 'notes'],
  reminders: ['date', 'channel', 'message', 'status', 'type'],
  vaccines: ['vaccine', 'batch', 'professional', 'status', 'notes'],
  prescriptions: ['professional', 'diagnosis', 'medication', 'instructions', 'status'],
  currentAccounts: ['date', 'type', 'concept', 'status', 'notes'],
  auditLogs: ['action', 'module', 'entityId', 'userEmail', 'summary'],
  users: ['displayName', 'email', 'role'],
  settings: ['clinicName', 'cuit', 'address', 'phone'],
}
