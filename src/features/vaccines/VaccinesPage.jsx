import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'

export function VaccinesPage() {
  const { clientOptions, patientOptions, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'vaccine', label: 'Aplicación' },
    { key: 'batch', label: 'Lote' },
    { key: 'nextDueDate', label: 'Próximo', render: (row) => dateLabel(row.nextDueDate) },
    { key: 'status', label: 'Estado' },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      ...columns,
      { key: 'professional', label: 'Profesional' },
      { key: 'notes', label: 'Notas' },
    ],
  })

  return (
    <CrudPage
      collectionName="vaccines"
      eyebrow="Medicina preventiva"
      title="Vacunas y antiparasitarios"
      description="Calendario sanitario por paciente, lote aplicado, vencimiento y próximo refuerzo. Exportación lista para carnet o control sanitario."
      createLabel="Nueva aplicación"
      searchFields={['vaccine', 'batch', 'professional', 'status', 'notes']}
      exportColumns={exportColumns}
      initialValues={{ date: todayISO(), nextDueDate: '', clientId: '', patientId: '', vaccine: '', batch: '', professional: '', status: 'Aplicada', notes: '' }}
      fields={[
        { name: 'date', label: 'Fecha aplicación', type: 'date', required: true },
        { name: 'nextDueDate', label: 'Próximo refuerzo', type: 'date' },
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true },
        { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions, required: true },
        { name: 'vaccine', label: 'Vacuna / antiparasitario', required: true },
        { name: 'batch', label: 'Lote' },
        { name: 'professional', label: 'Profesional' },
        { name: 'status', label: 'Estado', type: 'select', options: ['Aplicada', 'Programada', 'Vencida', 'Cancelada'] },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      columns={columns}
    />
  )
}
