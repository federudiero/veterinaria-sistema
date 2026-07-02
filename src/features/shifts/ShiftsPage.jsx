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
  const users = useCollection('users', { limitCount: 120, orderByField: 'displayName', orderDirection: 'asc' })
  const userOptions = users.items
    .filter((user) => user.active !== false && ['admin', 'veterinario'].includes(user.role))
    .map((user) => ({
      value: user.uid || user.id,
      label: `${user.displayName || user.email} (${user.role})`,
      group: 'Veterinarios',
    }))

  function beforeSave(payload) {
    const veterinarianIds = Array.isArray(payload.veterinarianIds) ? payload.veterinarianIds.slice(0, 2) : []
    return {
      ...payload,
      veterinarianIds,
      veterinarianNames: namesFromIds(veterinarianIds, users.items),
      status: payload.status || 'Abierto',
      date: payload.date || todayISO(),
    }
  }

  return (
    <CrudPage
      collectionName="shifts"
      eyebrow="Agenda"
      title="Turnos veterinarios"
      description="Turnos operativos para ventas y caja. Cada turno puede tener hasta dos veterinarios asignados."
      createLabel="Nuevo turno"
      searchFields={['name', 'status', 'notes']}
      beforeSave={beforeSave}
      defaultOrderByField="date"
      defaultOrderDirection="desc"
      initialValues={{
        date: todayISO(),
        name: 'Mañana',
        startTime: '09:00',
        endTime: '13:00',
        veterinarianIds: [],
        veterinarianNames: [],
        status: 'Abierto',
        notes: '',
      }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'name', label: 'Turno', type: 'select', options: ['Mañana', 'Tarde', 'Noche', 'Guardia'], required: true },
        { name: 'startTime', label: 'Hora inicio', type: 'time', required: true },
        { name: 'endTime', label: 'Hora fin', type: 'time', required: true },
        {
          name: 'veterinarianIds',
          label: 'Veterinarios asignados',
          type: 'permissionsChecklist',
          options: userOptions,
          hint: 'Seleccioná hasta 2 usuarios veterinarios o administradores.',
        },
        { name: 'status', label: 'Estado', type: 'select', options: ['Abierto', 'Cerrado'], required: true },
        { name: 'notes', label: 'Observaciones', type: 'textarea' },
      ]}
      columns={[
        { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
        { key: 'name', label: 'Turno' },
        { key: 'startTime', label: 'Inicio' },
        { key: 'endTime', label: 'Fin' },
        { key: 'veterinarianNames', label: 'Veterinarios', render: (row) => row.veterinarianNames?.join(', ') || 'Sin asignar' },
        { key: 'status', label: 'Estado' },
      ]}
      exportColumns={[
        { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
        { key: 'name', label: 'Turno' },
        { key: 'startTime', label: 'Inicio' },
        { key: 'endTime', label: 'Fin' },
        { key: 'veterinarianNames', label: 'Veterinarios', exportValue: (row) => row.veterinarianNames?.join(', ') || 'Sin asignar' },
        { key: 'status', label: 'Estado' },
        { key: 'notes', label: 'Observaciones' },
      ]}
    />
  )
}
