import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'

export function PrescriptionsPage() {
  const { clientOptions, patientOptions, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'professional', label: 'Profesional' },
    { key: 'medication', label: 'Medicación' },
    { key: 'status', label: 'Estado' },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      ...columns,
      { key: 'diagnosis', label: 'Diagnóstico' },
      { key: 'instructions', label: 'Indicaciones' },
      { key: 'notes', label: 'Notas internas' },
    ],
  })

  function normalizeLookupPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
  }

  return (
    <CrudPage
      collectionName="prescriptions"
      eyebrow="Clínica"
      title="Recetas e indicaciones"
      description="Indicaciones médicas, diagnóstico, medicación y estado. PDF profesional con datos completos del contacto y paciente."
      createLabel="Nueva receta"
      searchFields={['date', 'patientName', 'clientName', 'clientPhone', 'professional', 'diagnosis', 'medication', 'instructions', 'status', 'notes']}
      searchPlaceholder="Buscar receta por paciente, cliente, teléfono, profesional, medicación, diagnóstico o estado..."
      beforeSave={normalizeLookupPayload}
      exportColumns={exportColumns}
      initialValues={{ date: todayISO(), clientId: '', patientId: '', professional: '', diagnosis: '', medication: '', instructions: '', status: 'Activa', notes: '' }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true },
        { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions, required: true },
        { name: 'professional', label: 'Profesional', required: true },
        { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea' },
        { name: 'medication', label: 'Medicación', type: 'textarea', required: true },
        { name: 'instructions', label: 'Indicaciones', type: 'textarea', required: true },
        { name: 'status', label: 'Estado', type: 'select', options: ['Activa', 'Finalizada', 'Anulada'] },
        { name: 'notes', label: 'Notas internas', type: 'textarea' },
      ]}
      columns={columns}
    />
  )
}
