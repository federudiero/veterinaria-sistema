import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'

export function MembershipsPage() {
  const { clientOptions, patientOptions, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'plan', label: 'Plan' },
    { key: 'monthlyFee', label: 'Cuota', render: (row) => money(row.monthlyFee) },
    { key: 'nextBilling', label: 'Próximo cobro', render: (row) => dateLabel(row.nextBilling) },
    { key: 'status', label: 'Estado' },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      ...columns,
      { key: 'notes', label: 'Notas' },
    ],
  })

  function normalizeLookupPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
  }

  return (
    <CrudPage
      collectionName="memberships"
      eyebrow="Comercial"
      title="Mutualismo / planes"
      description="Planes mensuales/anuales, próxima facturación y estado del afiliado. Exportación con datos de contacto y paciente."
      createLabel="Nuevo plan"
      searchFields={['patientName', 'clientName', 'clientPhone', 'plan', 'status', 'nextBilling', 'notes']}
      searchPlaceholder="Buscar plan por cliente, paciente, teléfono, plan, estado o próximo cobro..."
      beforeSave={normalizeLookupPayload}
      exportColumns={exportColumns}
      dateField="nextBilling"
      defaultOrderByField="nextBilling"
      defaultOrderDirection="asc"
      initialValues={{ clientId: '', patientId: '', plan: '', monthlyFee: 0, status: 'Activo', nextBilling: '', notes: '' }}
      fields={[
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true },
        { name: 'patientId', label: 'Paciente', type: 'select', options: patientOptions },
        { name: 'plan', label: 'Plan', type: 'select', options: ['Plan básico', 'Plan anual', 'Plan premium', 'Convenio empresa'] },
        { name: 'monthlyFee', label: 'Cuota', type: 'number' },
        { name: 'status', label: 'Estado', type: 'select', options: ['Activo', 'Suspendido', 'Baja'] },
        { name: 'nextBilling', label: 'Próximo cobro', type: 'date' },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      enableTags
      columns={columns}
    />
  )
}
