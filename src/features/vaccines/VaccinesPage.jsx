import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'
import { repository } from '../../services/repositories/repositoryFactory.js'

export function VaccinesPage() {
  const { clientOptions, patientOptionsForClient, clientMap, patientMap, clientById, patientById } = useLookups()

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
      { key: 'clinicalRecordId', label: 'Historia clínica vinculada' },
    ],
  })

  function normalizeLookupPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, patientMap, clientById, patientById })
  }

  async function syncClinicalHistory(payload, editing, savedId) {
    if (!savedId || !payload.patientId) return
    const title = `Vacuna / antiparasitario: ${payload.vaccine || 'Aplicación sanitaria'}`
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
      type: 'Vacunación',
      reason: title,
      title,
      professional: payload.professional || '',
      source: 'vaccines',
      sourceId: savedId,
      sourceLabel: payload.vaccine || '',
      prescriptionText: '',
      indications: [payload.batch ? `Lote: ${payload.batch}` : '', payload.nextDueDate ? `Próximo refuerzo: ${dateLabel(payload.nextDueDate)}` : '', payload.notes || ''].filter(Boolean).join(' · '),
      notes: payload.notes || '',
    }

    if (editing?.clinicalRecordId) {
      await repository.updateDocument('clinicalRecords', editing.clinicalRecordId, clinicalPayload)
      return
    }

    const clinicalRecordId = await repository.createDocument('clinicalRecords', clinicalPayload)
    await repository.updateDocument('vaccines', savedId, { clinicalRecordId })
  }

  return (
    <CrudPage
      collectionName="vaccines"
      eyebrow="Medicina preventiva"
      title="Vacunas y antiparasitarios"
      description="Calendario sanitario por paciente. Cada aplicación guardada queda reflejada también en la historia clínica unificada del animal."
      createLabel="Nueva aplicación"
      searchFields={['date', 'nextDueDate', 'patientName', 'clientName', 'clientPhone', 'vaccine', 'batch', 'professional', 'status', 'notes']}
      searchPlaceholder="Buscar vacuna por paciente, cliente, teléfono, aplicación, lote, profesional o estado..."
      beforeSave={normalizeLookupPayload}
      afterSave={syncClinicalHistory}
      exportColumns={exportColumns}
      initialValues={{ date: todayISO(), nextDueDate: '', clientId: '', patientId: '', vaccine: '', batch: '', professional: '', status: 'Aplicada', notes: '' }}
      fields={[
        { name: 'date', label: 'Fecha aplicación', type: 'date', required: true },
        { name: 'nextDueDate', label: 'Próximo refuerzo', type: 'date' },
        { name: 'clientId', label: 'Cliente', type: 'select', options: clientOptions, required: true, searchPlaceholder: 'Buscar tutor...', onChange: () => ({ patientId: '' }) },
        { name: 'patientId', label: 'Paciente', type: 'select', options: ({ form }) => patientOptionsForClient(form.clientId, form.patientId), required: true, disabled: ({ form }) => !form.clientId, searchPlaceholder: 'Buscar paciente del tutor...', hint: ({ form }) => form.clientId ? 'Solo se muestran pacientes del tutor seleccionado.' : 'Primero seleccioná un tutor.' },
        { name: 'vaccine', label: 'Vacuna / antiparasitario', required: true },
        { name: 'batch', label: 'Lote' },
        { name: 'professional', label: 'Profesional' },
        { name: 'status', label: 'Estado', type: 'select', options: ['Aplicada', 'Programada', 'Vencida', 'Cancelada'] },
        { name: 'notes', label: 'Notas', type: 'textarea' },
      ]}
      enableTags
      columns={columns}
    />
  )
}
