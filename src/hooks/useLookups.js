import { useMemo } from 'react'
import { useCollection } from './useCollection.js'

function toMap(items, labelFactory) {
  return Object.fromEntries(items.map((item) => [item.id, labelFactory(item)]))
}

function compactKeywords(...values) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' ')
}

const lookupOptions = { limitCount: 300, orderByField: 'name', orderDirection: 'asc' }
const productLookupOptions = { limitCount: 1000, orderByField: 'name', orderDirection: 'asc' }

export function useLookups() {
  const clients = useCollection('clients', lookupOptions)
  const patients = useCollection('patients', lookupOptions)
  const products = useCollection('products', productLookupOptions)
  const suppliers = useCollection('suppliers', lookupOptions)

  return useMemo(() => {
    const clientById = Object.fromEntries(clients.items.map((item) => [item.id, item]))
    const patientById = Object.fromEntries(patients.items.map((item) => [item.id, item]))
    const productById = Object.fromEntries(products.items.map((item) => [item.id, item]))
    const supplierById = Object.fromEntries(suppliers.items.map((item) => [item.id, item]))
    const clientMap = toMap(clients.items, (item) => item.name)
    const patientMap = toMap(patients.items, (item) => `${item.name}${clientMap[item.clientId] ? ` · ${clientMap[item.clientId]}` : ''}`)
    const productMap = toMap(products.items, (item) => item.name)
    const supplierMap = toMap(suppliers.items, (item) => item.name)

    const clientOptions = clients.items.map((item) => ({
      value: item.id,
      label: `${item.name}${item.phone ? ` · ${item.phone}` : ''}`,
      keywords: compactKeywords(
        item.name,
        item.phone,
        item.email,
        item.dni,
        item.document,
        item.cuit,
        item.address,
        item.city,
        item.segment,
        item.status,
        item.notes,
      ),
    }))

    const patientOptions = patients.items.map((item) => {
      const client = clientById[item.clientId] || {}
      return {
        value: item.id,
        label: patientMap[item.id],
        clientId: item.clientId || '',
        keywords: compactKeywords(
          item.name,
          client.name,
          client.phone,
          client.email,
          item.species,
          item.breed,
          item.chip,
          item.color,
          item.sex,
          item.status,
          item.allergies,
          item.alerts,
        ),
      }
    })

    const patientOptionsForClient = (clientId, selectedPatientId = '') => {
      const selected = selectedPatientId ? patientOptions.find((option) => String(option.value) === String(selectedPatientId)) : null
      const filtered = clientId
        ? patientOptions.filter((option) => String(option.clientId || '') === String(clientId))
        : patientOptions
      if (selected && !filtered.some((option) => String(option.value) === String(selected.value))) {
        return [selected, ...filtered]
      }
      return filtered
    }

    return {
      clients: clients.items,
      patients: patients.items,
      products: products.items,
      refreshProducts: products.refresh,
      suppliers: suppliers.items,
      clientMap,
      patientMap,
      productMap,
      supplierMap,
      clientById,
      patientById,
      productById,
      supplierById,
      clientOptions,
      patientOptions,
      patientOptionsForClient,
      productOptions: products.items.map((item) => ({
        value: item.id,
        label: `${item.name}${item.sku ? ` · ${item.sku}` : ''}`,
        keywords: compactKeywords(item.name, item.sku, item.barcode, item.category, item.type, item.unit, item.description, item.notes),
      })),
      supplierOptions: suppliers.items.map((item) => ({
        value: item.id,
        label: item.name,
        keywords: compactKeywords(item.name, item.cuit, item.phone, item.email, item.address, item.contactName, item.notes),
      })),
    }
  }, [clients.items, patients.items, products.items, products.refresh, suppliers.items])
}
