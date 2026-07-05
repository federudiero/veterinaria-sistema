import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'

export function BoardingPage() {
  const { clientOptions, patientOptions, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'room', label: 'Sala' },
    { key: 'startDate', label: 'Ingreso', render: (row) => dateLabel(row.startDate) },
    { key: 'status', label: 'Estado' },
    { key: 'amount', label: 'Importe', render: (row) => money(row.amount) },
    { key: 'paid', label: 'Pago', render: (row) => row.paid ? 'Pagado' : 'Pendiente' },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      ...columns,
      { key: 'endDate', label: 'Alta', render: (row) => dateLabel(row.endDate) },
      { key: 'feeding', label: 'Alimentación' },
      { key: 'medication', label: 'Medicación' },
      { key: 'notes', label: 'Notas' },
    ],
  })

  function normalizeLookupPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
  }

  return (
    <CrudPage
      collectionName="boarding"
      eyebrow="Clínica"
      title="Internación y guardería"
      description="Control de caniles, medicación, alimentación, importes y estado. Exportación detallada por paciente/contacto."
      createLabel="Nueva internación"
      searchFields={['patientName', 'clientName', 'clientPhone', 'room', 'startDate', 'endDate', 'status', 'feeding', 'medication', 'notes']}
      searchPlaceholder="Buscar internación por paciente, cliente, teléfono, canil, estado, medicación o alimentación..."
      beforeSave={normalizeLookupPayload}
      exportColumns={exportColumns}
      dateField="startDate"
      defaultOrderByField="startDate"
      defaultOrderDirection="desc"
      initialValues={{ patientId: '', clientId: '', room: '', startDate: todayISO(), endDate: '', status: 'Internado', feeding: '', medication: '', amount: 0, paid: false, notes: '' }}
      fields={[
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true },
        { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions, required: true },
        { name: 'room', label: 'Canil / sala' },
        { name: 'startDate', label: 'Ingreso', type: 'date' },
        { name: 'endDate', label: 'Alta', type: 'date' },
        { name: 'status', label: 'Estado', type: 'select', options: ['Internado', 'Observación', 'Guardería', 'Alta'] },
        { name: 'feeding', label: 'Alimentación', type: 'textarea' },
        { name: 'medication', label: 'Medicación', type: 'textarea' },
        { name: 'amount', label: 'Importe', type: 'number' },
        { name: 'paid', label: 'Pagado', type: 'checkbox' },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      enableTags
      columns={columns}
    />
  )
}
