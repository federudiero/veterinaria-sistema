import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'
import { repository } from '../../services/repositories/repositoryFactory.js'

export function PrescriptionsPage() {
  const { clientOptions, patientOptionsForClient, clientMap, patientMap, clientById, patientById } = useLookups()

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
      { key: 'clinicalRecordId', label: 'Historia clínica vinculada' },
    ],
  })

  function normalizeLookupPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
  }

  async function syncClinicalHistory(payload, editing, savedId) {
    if (!savedId || !payload.patientId) return
    const title = `Receta / indicación: ${payload.medication || payload.diagnosis || 'Tratamiento'}`
    const clinicalPayload = {
      date: payload.date || todayISO(),
      patientId: payload.patientId,
      clientId: payload.clientId || '',
      clientName: payload.clientName || '',
      clientPhone: payload.clientPhone || '',
      clientEmail: payload.clientEmail || '',
      patientName: payload.patientName || patientMap[payload.patientId] || '',
      patientSpecies: payload.patientSpecies || patientById[payload.patientId]?.species || '',
      patientBreed: payload.patientBreed || patientById[payload.patientId]?.breed || '',
      type: 'Receta',
      reason: title,
      title,
      professional: payload.professional || '',
      source: 'prescriptions',
      sourceId: savedId,
      sourceLabel: payload.medication || '',
      diagnosis: payload.diagnosis || '',
      prescriptionText: payload.medication || '',
      indications: payload.instructions || '',
      notes: payload.notes || '',
    }

    if (editing?.clinicalRecordId) {
      await repository.updateDocument('clinicalRecords', editing.clinicalRecordId, clinicalPayload)
      return
    }

    const clinicalRecordId = await repository.createDocument('clinicalRecords', clinicalPayload)
    await repository.updateDocument('prescriptions', savedId, { clinicalRecordId })
  }

  return (
    <CrudPage
      collectionName="prescriptions"
      eyebrow="Clínica"
      title="Recetas e indicaciones"
      description="Indicaciones médicas por paciente. Cada receta guardada queda reflejada también en la historia clínica unificada del animal."
      createLabel="Nueva receta"
      searchFields={['date', 'patientName', 'clientName', 'clientPhone', 'professional', 'diagnosis', 'medication', 'instructions', 'status', 'notes']}
      searchPlaceholder="Buscar receta por paciente, cliente, teléfono, profesional, medicación, diagnóstico o estado..."
      beforeSave={normalizeLookupPayload}
      afterSave={syncClinicalHistory}
      exportColumns={exportColumns}
      initialValues={{ date: todayISO(), clientId: '', patientId: '', professional: '', diagnosis: '', medication: '', instructions: '', status: 'Activa', notes: '' }}
      fields={[
        { name: 'date', label: 'Fecha', type: 'date', required: true },
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true, searchPlaceholder: 'Buscar tutor...', onChange: () => ({ patientId: '' }) },
        { name: 'patientId', label: 'Paciente', type: 'select', options: ({ form }) => patientOptionsForClient(form.clientId, form.patientId), required: true, disabled: ({ form }) => !form.clientId, searchPlaceholder: 'Buscar paciente del tutor...', hint: ({ form }) => form.clientId ? 'Solo se muestran pacientes del tutor seleccionado.' : 'Primero seleccioná un tutor.' },
        { name: 'professional', label: 'Profesional', required: true },
        { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea' },
        { name: 'medication', label: 'Medicación', type: 'textarea', required: true },
        { name: 'instructions', label: 'Indicaciones', type: 'textarea', required: true },
        { name: 'status', label: 'Estado', type: 'select', options: ['Activa', 'Finalizada', 'Anulada'] },
        { name: 'notes', label: 'Notas internas', type: 'textarea' },
      ]}
      enableTags
      columns={columns}
    />
  )
}
