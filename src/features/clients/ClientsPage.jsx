import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'

export function ClientsPage() {
  return (
    <CrudPage
      collectionName="clients"
      eyebrow="Maestros"
      title="Clientes"
      description="Dueños, datos de contacto, dirección, segmento y observaciones comerciales."
      createLabel="Nuevo cliente"
      searchFields={['name', 'phone', 'email', 'dni', 'address', 'city', 'segment', 'notes']}
      searchPlaceholder="Buscar cliente por nombre, DNI/CUIT, teléfono, email, ciudad o segmento..."
      initialValues={{ name: '', dni: '', phone: '', email: '', address: '', city: '', segment: 'Nuevo', notes: '' }}
      fields={[
        { name: 'name', label: 'Nombre completo', required: true },
        { name: 'dni', label: 'DNI / CUIT' },
        { name: 'phone', label: 'Teléfono' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'address', label: 'Dirección' },
        { name: 'city', label: 'Ciudad' },
        { name: 'segment', label: 'Segmento', type: 'select', options: ['Nuevo', 'Frecuente', 'Cuenta corriente', 'VIP', 'Inactivo'] },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      columns={[
        { key: 'name', label: 'Cliente' },
        { key: 'phone', label: 'Teléfono' },
        { key: 'email', label: 'Email' },
        { key: 'address', label: 'Dirección' },
        { key: 'segment', label: 'Segmento' },
      ]}
    />
  )
}
