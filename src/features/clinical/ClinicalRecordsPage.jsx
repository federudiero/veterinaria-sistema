import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'

export function ClinicalRecordsPage() {
  const { patientOptions, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'type', label: 'Tipo' },
    { key: 'professional', label: 'Profesional' },
    { key: 'diagnosis', label: 'Diagnóstico' },
    { key: 'amount', label: 'Importe', render: (row) => money(row.amount) },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      ...columns,
      { key: 'reason', label: 'Motivo de consulta' },
      { key: 'treatment', label: 'Tratamiento / indicaciones' },
      { key: 'nextControl', label: 'Próximo control', render: (row) => dateLabel(row.nextControl) },
      { key: 'paid', label: 'Pagado', render: (row) => row.paid ? 'Sí' : 'No' },
    ],
  })

  function normalizeLookupPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
  }

  return (
    <CrudPage
      collectionName="clinicalRecords"
      eyebrow="Clínica"
      title="Historia clínica"
      description="Consultas, diagnósticos, tratamientos, controles y montos asociados. El PDF sale con datos completos del paciente y contacto."
      createLabel="Nueva atención"
      searchFields={['date', 'patientName', 'clientName', 'clientPhone', 'type', 'professional', 'reason', 'diagnosis', 'treatment', 'nextControl']}
      searchPlaceholder="Buscar atención por paciente, cliente, teléfono, tipo, profesional, diagnóstico o tratamiento..."
      beforeSave={normalizeLookupPayload}
      exportColumns={exportColumns}
      initialValues={{ date: todayISO(), patientId: '', type: 'Consulta', professional: '', reason: '', diagnosis: '', treatment: '', nextControl: '', amount: 0, paid: false }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'patientId', label: 'Paciente', type: 'select', required: true, options: patientOptions },
        { name: 'type', label: 'Tipo', type: 'select', options: ['Consulta', 'Vacunación', 'Cirugía', 'Control', 'Laboratorio', 'Urgencia'] },
        { name: 'professional', label: 'Profesional' },
        { name: 'reason', label: 'Motivo', type: 'textarea' },
        { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea' },
        { name: 'treatment', label: 'Tratamiento / indicaciones', type: 'textarea' },
        { name: 'nextControl', label: 'Próximo control', type: 'date' },
        { name: 'amount', label: 'Importe', type: 'number' },
        { name: 'paid', label: 'Pagado', type: 'checkbox' },
      ]}
      columns={columns}
    />
  )
}
