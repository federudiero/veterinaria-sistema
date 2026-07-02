import { useMemo } from 'react'
import { useCollection } from './useCollection.js'

function toMap(items, labelFactory) {
  return Object.fromEntries(items.map((item) => [item.id, labelFactory(item)]))
}

const lookupOptions = { limitCount: 300, orderByField: 'name', orderDirection: 'asc' }

export function useLookups() {
  const clients = useCollection('clients', lookupOptions)
  const patients = useCollection('patients', lookupOptions)
  const products = useCollection('products', lookupOptions)
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

    return {
      clients: clients.items,
      patients: patients.items,
      products: products.items,
      suppliers: suppliers.items,
      clientMap,
      patientMap,
      productMap,
      supplierMap,
      clientById,
      patientById,
      productById,
      supplierById,
      clientOptions: clients.items.map((item) => ({ value: item.id, label: `${item.name}${item.phone ? ` · ${item.phone}` : ''}` })),
      patientOptions: patients.items.map((item) => ({ value: item.id, label: patientMap[item.id] })),
      productOptions: products.items.map((item) => ({ value: item.id, label: `${item.name}${item.sku ? ` · ${item.sku}` : ''}` })),
      supplierOptions: suppliers.items.map((item) => ({ value: item.id, label: item.name })),
    }
  }, [clients.items, patients.items, products.items, suppliers.items])
}
