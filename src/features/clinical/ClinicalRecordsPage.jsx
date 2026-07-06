import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'

export function ClinicalRecordsPage() {
  const { clientOptions, patientOptionsForClient, clientMap, patientMap, clientById, patientById } = useLookups()

  const columns = [
    { key: 'date', label: 'Fecha', render: (row) => dateLabel(row.date) },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'type', label: 'Tipo' },
    { key: 'reason', label: 'Motivo / título' },
    { key: 'professional', label: 'Personal que atendió' },
    { key: 'diagnosis', label: 'Diagnóstico' },
    { key: 'prescriptionText', label: 'Recetado / indicado' },
  ]

  const exportColumns = patientContactExportColumns({
    clientById,
    patientById,
    baseColumns: [
      ...columns,
      { key: 'source', label: 'Origen' },
    ],
  })

  function normalizeLookupPayload(payload) {
    const normalized = withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
    return {
      ...normalized,
      title: normalized.reason || normalized.title || '',
    }
  }

  return (
    <CrudPage
      collectionName="clinicalRecords"
      eyebrow="Clínica"
      title="Historia clínica"
      description="Registro principal por animal. Se carga el motivo de la visita y el personal que atendió; vacunas y recetas se reflejan automáticamente desde sus formularios."
      createLabel="Nueva entrada clínica"
      searchFields={['date', 'patientName', 'clientName', 'clientPhone', 'type', 'professional', 'reason', 'title', 'diagnosis', 'indications', 'prescriptionText', 'source']}
      searchPlaceholder="Buscar por paciente, cliente, teléfono, motivo, tipo o personal que atendió..."
      beforeSave={normalizeLookupPayload}
      exportColumns={exportColumns}
      initialValues={{ date: todayISO(), clientId: '', patientId: '', type: 'Consulta', reason: '', professional: '', diagnosis: '', indications: '', prescriptionText: '' }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'clientId', label: 'Tutor / responsable', type: 'select', required: true, options: clientOptions, searchPlaceholder: 'Buscar tutor...', onChange: () => ({ patientId: '' }) },
        { name: 'patientId', label: 'Paciente', type: 'select', required: true, options: ({ form }) => patientOptionsForClient(form.clientId, form.patientId), disabled: ({ form }) => !form.clientId, searchPlaceholder: 'Buscar paciente del tutor...', hint: ({ form }) => form.clientId ? 'Solo se muestran pacientes del tutor seleccionado.' : 'Primero seleccioná un tutor.' },
        { name: 'type', label: 'Tipo', type: 'select', options: ['Consulta', 'Vacunación', 'Receta', 'Cirugía', 'Control', 'Laboratorio', 'Urgencia', 'Otro'] },
        { name: 'reason', label: 'Título / motivo de la visita', required: true, placeholder: 'Ej: Control general, tos, vacuna anual...' },
        { name: 'professional', label: 'Personal que atendió' },
        { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea', rows: 3 },
        { name: 'prescriptionText', label: 'Medicación / receta indicada', type: 'textarea', rows: 3, placeholder: 'Ej: medicamento, dosis, frecuencia y duración...' },
        { name: 'indications', label: 'Indicaciones / orden médica', type: 'textarea', rows: 3, placeholder: 'Ej: reposo, controles, estudios, alimentación, cuidados...' },
      ]}
      enableTags
      columns={columns}
    />
  )
}
