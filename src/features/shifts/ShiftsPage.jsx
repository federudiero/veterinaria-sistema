import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'

function namesFromIds(ids, users) {
  const selected = Array.isArray(ids) ? ids : []
  return selected
    .map((id) => users.find((user) => user.id === id || user.uid === id)?.displayName || users.find((user) => user.id === id || user.uid === id)?.email)
    .filter(Boolean)
}

export function ShiftsPage() {
  const users = useCollection('users', { limitCount: 160, orderByField: 'displayName', orderDirection: 'asc' })
  const userOptions = users.items
    .filter((user) => user.active !== false && ['admin', 'veterinario', 'recepcion', 'caja'].includes(user.role))
    .map((user) => ({
      value: user.uid || user.id,
      label: `${user.displayName || user.email} (${user.role})`,
      group: 'Usuarios de operación',
    }))

  function beforeSave(payload) {
    const responsibleIds = Array.isArray(payload.veterinarianIds) ? payload.veterinarianIds.slice(0, 3) : []
    const responsibleNames = namesFromIds(responsibleIds, users.items)
    return {
      ...payload,
      veterinarianIds: responsibleIds,
      veterinarianNames: responsibleNames,
      cashierIds: responsibleIds,
      cashierNames: responsibleNames,
      responsibleUserIds: responsibleIds,
      responsibleUserNames: responsibleNames,
      status: payload.status || 'Abierto',
      date: payload.date || todayISO(),
    }
  }

  return (
    <CrudPage
      collectionName="shifts"
      eyebrow="Caja"
      title="Turnos de caja"
      description="Turnos operativos para ventas, movimientos y cierre de caja. Asigná los usuarios que pueden vender o cerrar dentro de cada turno."
      createLabel="Nuevo turno de caja"
      searchFields={['name', 'status', 'notes', 'veterinarianNames', 'responsibleUserNames']}
      beforeSave={beforeSave}
      defaultOrderByField="date"
      defaultOrderDirection="desc"
      initialValues={{
        date: todayISO(),
        name: 'Mañana',
        startTime: '08:00',
        endTime: '14:00',
        veterinarianIds: [],
        veterinarianNames: [],
        status: 'Abierto',
        notes: '',
      }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'name', label: 'Nombre del turno', type: 'select', options: ['Mañana', 'Tarde', 'Noche', 'Guardia', 'Personalizado'] },
        { name: 'startTime', label: 'Inicio', type: 'time', required: true },
        { name: 'endTime', label: 'Fin', type: 'time', required: true },
        {
          name: 'veterinarianIds',
          label: 'Usuarios responsables',
          type: 'permissionsChecklist',
          options: userOptions,
          hint: 'Estos usuarios pueden registrar ventas y movimientos en este turno. El administrador puede operar cualquier turno abierto.',
        },
        { name: 'status', label: 'Estado', type: 'select', options: ['Abierto', 'Cerrado'] },
        { name: 'notes', label: 'Observaciones', type: 'textarea' },
      ]}
      columns={[
        { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
        { key: 'name', label: 'Turno' },
        { key: 'schedule', label: 'Horario', render: (row) => `${row.startTime || '-'} - ${row.endTime || '-'}` },
        { key: 'veterinarianNames', label: 'Responsables', render: (row) => row.veterinarianNames?.join(', ') || 'Sin asignar' },
        { key: 'status', label: 'Estado' },
        { key: 'shiftClosureId', label: 'Cierre', render: (row) => row.shiftClosureId ? 'Cerrado con caja' : '-' },
      ]}
      exportColumns={[
        { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
        { key: 'name', label: 'Turno' },
        { key: 'startTime', label: 'Inicio' },
        { key: 'endTime', label: 'Fin' },
        { key: 'veterinarianNames', label: 'Responsables', exportValue: (row) => row.veterinarianNames?.join(', ') || '-' },
        { key: 'status', label: 'Estado' },
        { key: 'shiftClosureId', label: 'Cierre de caja' },
        { key: 'closedBy', label: 'Cerrado por' },
        { key: 'notes', label: 'Observaciones' },
      ]}
    />
  )
}
