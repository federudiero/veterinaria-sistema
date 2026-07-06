import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'

export function WaitingQueuePage() {
  const { clientOptions, patientOptionsForClient, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'service', label: 'Servicio' },
    { key: 'priority', label: 'Prioridad' },
    { key: 'professional', label: 'Profesional' },
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
      collectionName="waitingQueue"
      eyebrow="Recepción"
      title="Cola de espera"
      description="Ingreso rápido de pacientes que esperan atención, guardia o derivación. Exportación útil para recepción y pase interno."
      createLabel="Agregar a cola"
      searchFields={['patientName', 'clientName', 'clientPhone', 'service', 'priority', 'professional', 'status', 'notes']}
      searchPlaceholder="Buscar cola por cliente, paciente, teléfono, servicio, prioridad, profesional o estado..."
      beforeSave={normalizeLookupPayload}
      exportColumns={exportColumns}
      initialValues={{ clientId: '', patientId: '', service: '', priority: 'Media', professional: '', status: 'En espera', notes: '' }}
      fields={[
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true, searchPlaceholder: 'Buscar tutor...', onChange: () => ({ patientId: '' }) },
        { name: 'patientId', label: 'Paciente', type: 'select', options: ({ form }) => patientOptionsForClient(form.clientId, form.patientId), required: true, disabled: ({ form }) => !form.clientId, searchPlaceholder: 'Buscar paciente del tutor...', hint: ({ form }) => form.clientId ? 'Solo se muestran pacientes del tutor seleccionado.' : 'Primero seleccioná un tutor.' },
        { name: 'service', label: 'Servicio / motivo' },
        { name: 'priority', label: 'Prioridad', type: 'select', options: ['Baja', 'Media', 'Alta', 'Urgente'] },
        { name: 'professional', label: 'Profesional' },
        { name: 'status', label: 'Estado', type: 'select', options: ['En espera', 'Llamado', 'En atención', 'Finalizado', 'Cancelado'] },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      enableTags
      columns={columns}
    />
  )
}
