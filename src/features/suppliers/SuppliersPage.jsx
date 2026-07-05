import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { money } from '../../utils/formatters.js'

export function SuppliersPage() {
  return (
    <CrudPage
      collectionName="suppliers"
      eyebrow="Compras"
      title="Proveedores"
      description="Datos comerciales, contacto y saldo del proveedor."
      createLabel="Nuevo proveedor"
      searchFields={['name', 'cuit', 'phone', 'email', 'address', 'notes']}
      searchPlaceholder="Buscar proveedor por nombre, CUIT, teléfono, email, dirección o notas..."
      initialValues={{ name: '', cuit: '', phone: '', email: '', address: '', balance: 0, notes: '' }}
      fields={[
        { name: 'name', label: 'Razón social / nombre', required: true },
        { name: 'cuit', label: 'CUIT' },
        { name: 'phone', label: 'Teléfono' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Dirección' },
        { name: 'balance', label: 'Saldo', type: 'number' },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      enableTags
      columns={[
        { key: 'name', label: 'Proveedor' },
        { key: 'cuit', label: 'CUIT' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'email', label: 'Email' },
        { key: 'balance', label: 'Saldo', render: (row) => money(row.balance) },
      ]}
    />
  )
}
