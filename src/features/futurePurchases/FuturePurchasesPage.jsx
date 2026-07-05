import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, numberValue, todayISO } from '../../utils/formatters.js'

export function FuturePurchasesPage() {
  const { clientOptions, patientOptions, supplierOptions, clientMap, patientMap, supplierMap } = useLookups()

  const columns = [
    { key: 'date', label: 'Pedido', render: (row) => dateLabel(row.date) },
    { key: 'neededDate', label: 'Para el día', render: (row) => dateLabel(row.neededDate) },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || row.clientName || '-' },
    { key: 'productName', label: 'Producto encargado' },
    { key: 'qty', label: 'Cant.' },
    { key: 'estimatedPrice', label: 'Precio estimado', render: (row) => money(row.estimatedPrice) },
    { key: 'deposit', label: 'Seña', render: (row) => money(row.deposit) },
    { key: 'status', label: 'Estado' },
  ]

  const exportColumns = [
    ...columns,
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'supplierId', label: 'Proveedor', render: (row) => supplierMap[row.supplierId] || row.supplierName || '-' },
    { key: 'clientPhone', label: 'Teléfono' },
    { key: 'priority', label: 'Prioridad' },
    { key: 'notes', label: 'Notas' },
  ]

  function normalizeFuturePurchase(payload) {
    const qty = Math.max(1, numberValue(payload.qty) || 1)
    return {
      ...payload,
      qty,
      estimatedPrice: numberValue(payload.estimatedPrice),
      deposit: numberValue(payload.deposit),
      pendingAmount: Math.max(numberValue(payload.estimatedPrice) - numberValue(payload.deposit), 0),
      clientName: clientMap[payload.clientId] || payload.clientName || '',
      patientName: patientMap[payload.patientId] || '',
      supplierName: supplierMap[payload.supplierId] || payload.supplierName || '',
      stockAffected: false,
      type: 'Compra futura sin stock',
    }
  }

  return (
    <CrudPage
      collectionName="futurePurchases"
      eyebrow="Mostrador"
      title="Compras futuras"
      description="Encargos de clientes para productos que todavía no están en stock. Esta sección no descuenta stock ni genera movimiento de inventario. Sirve para dejar asentado qué hay que conseguir y para qué día tiene que estar listo."
      createLabel="Nuevo encargo"
      searchFields={['date', 'neededDate', 'clientName', 'clientPhone', 'patientName', 'productName', 'status', 'supplierName', 'priority', 'notes']}
      searchPlaceholder="Buscar encargo por cliente, teléfono, paciente, producto, proveedor, prioridad o estado..."
      exportColumns={exportColumns}
      exportSubtitle="Compras futuras y encargos pendientes. No afectan stock hasta que se registre una compra real o una venta real."
      exportFileLabel="compras-futuras"
      dateField="neededDate"
      statusField="status"
      statusOptions={['Pendiente', 'Pedido al proveedor', 'Disponible para retirar', 'Entregado', 'Cancelado']}
      defaultOrderByField="neededDate"
      defaultOrderDirection="asc"
      initialValues={{
        date: todayISO(),
        neededDate: todayISO(),
        clientId: '',
        patientId: '',
        clientName: '',
        clientPhone: '',
        productName: '',
        qty: 1,
        estimatedPrice: 0,
        deposit: 0,
        supplierId: '',
        priority: 'Normal',
        status: 'Pendiente',
        notes: '',
        stockAffected: false,
      }}
      beforeSave={normalizeFuturePurchase}
      fields={[
        { name: 'date', label: 'Fecha del pedido', type: 'date', required: true },
        { name: 'neededDate', label: 'Fecha prometida / retiro', type: 'date', required: true },
        { name: 'clientId', label: 'Cliente existente', type: 'select', options: clientOptions, hint: 'Opcional. Si no está cargado, completá nombre y teléfono abajo.' },
        { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions },
        { name: 'clientName', label: 'Nombre cliente manual' },
        { name: 'clientPhone', label: 'Teléfono / WhatsApp' },
        { name: 'productName', label: 'Producto encargado', required: true, placeholder: 'Ej: alimento 15 kg cerrado adulto...' },
        { name: 'qty', label: 'Cantidad', type: 'number', min: 1, required: true },
        { name: 'estimatedPrice', label: 'Precio estimado', type: 'number', min: 0 },
        { name: 'deposit', label: 'Seña', type: 'number', min: 0 },
        { name: 'supplierId', label: 'Proveedor sugerido', type: 'select', options: supplierOptions },
        { name: 'priority', label: 'Prioridad', type: 'select', options: ['Normal', 'Alta', 'Urgente'] },
        { name: 'status', label: 'Estado', type: 'select', options: ['Pendiente', 'Pedido al proveedor', 'Disponible para retirar', 'Entregado', 'Cancelado'] },
        { name: 'notes', label: 'Notas', type: 'textarea', rows: 4, hint: 'No afecta stock. Cuando llegue el producto, cargá la compra real en Compras o cargalo al stock desde el flujo normal.' },
      ]}
      enableTags
      columns={columns}
      emptyState="No hay compras futuras registradas."
    />
  )
}
