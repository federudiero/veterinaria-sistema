import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { sharedDailyCashSessionId } from '../../utils/shifts.js'

export function ShiftsPage() {
  function beforeSave(payload, editing) {
    const date = payload.date || todayISO()
    return {
      ...payload,
      id: editing?.id || sharedDailyCashSessionId(date),
      date,
      name: 'Caja del día',
      cashSessionScope: 'sharedDaily',
      sharedDaily: true,
      veterinarianIds: [],
      veterinarianNames: [],
      cashierIds: [],
      cashierNames: [],
      responsibleUserIds: [],
      responsibleUserNames: [],
      status: payload.status || 'Abierto',
    }
  }

  return (
    <CrudPage
      collectionName="shifts"
      eyebrow="Caja"
      title="Cajas del día"
      description="Caja diaria compartida del negocio. Para cada fecha se usa un único registro interno compatible con shiftId; las ventas, cobros y movimientos guardan el usuario que los creó."
      createLabel="Abrir caja del día"
      searchFields={['date', 'name', 'status', 'notes', 'cashSessionScope']}
      searchPlaceholder="Buscar caja por fecha, estado u observación..."
      beforeSave={beforeSave}
      documentIdField="id"
      allowDelete={false}
      defaultOrderByField="date"
      defaultOrderDirection="desc"
      initialValues={{
        date: todayISO(),
        name: 'Caja del día',
        startTime: '08:00',
        endTime: '',
        status: 'Abierto',
        notes: 'Caja diaria compartida para todo el negocio.',
      }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'startTime', label: 'Hora de apertura', type: 'time' },
        { name: 'endTime', label: 'Hora de cierre estimada', type: 'time' },
        { name: 'status', label: 'Estado', type: 'select', options: ['Abierto', 'Cerrado'] },
        { name: 'notes', label: 'Observaciones', type: 'textarea' },
      ]}
      enableTags
      columns={[
        { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
        { key: 'name', label: 'Caja', render: () => 'Caja del día' },
        { key: 'schedule', label: 'Horario', render: (row) => `${row.startTime || '-'} - ${row.endTime || '-'}` },
        { key: 'status', label: 'Estado' },
        { key: 'shiftClosureId', label: 'Cierre', render: (row) => row.shiftClosureId ? 'Cerrada con caja' : '-' },
      ]}
      exportColumns={[
        { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
        { key: 'name', label: 'Caja', exportValue: () => 'Caja del día' },
        { key: 'startTime', label: 'Apertura' },
        { key: 'endTime', label: 'Cierre estimado' },
        { key: 'status', label: 'Estado' },
        { key: 'shiftClosureId', label: 'Cierre' },
        { key: 'closedBy', label: 'Cerrado por' },
        { key: 'notes', label: 'Observaciones' },
      ]}
    />
  )
}
