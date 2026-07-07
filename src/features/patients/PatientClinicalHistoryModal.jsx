import React, { useId, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { useLookups } from '../../hooks/useLookups.js'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'
import { printClinicalHistoryDocument } from '../../utils/professionalDocuments.js'
import { getClinicalPdfUrl, uploadClinicalPdf, isValidClinicalPdf, MAX_CLINICAL_PDF_SIZE_BYTES } from '../../services/storage/clinicalFilesStorage.js'
import { dateLabel, todayISO } from '../../utils/formatters.js'
import { buildSearchPayload } from '../../utils/search.js'

const clinicalSearchFields = ['date', 'patientName', 'clientName', 'clientPhone', 'type', 'professional', 'reason', 'title', 'diagnosis', 'indications', 'prescriptionText', 'notes', 'source']
const vaccineSearchFields = ['date', 'nextDueDate', 'patientName', 'clientName', 'clientPhone', 'vaccine', 'batch', 'professional', 'status', 'notes']
const prescriptionSearchFields = ['date', 'patientName', 'clientName', 'clientPhone', 'professional', 'diagnosis', 'medication', 'instructions', 'status', 'notes']
const clinicalFileSearchFields = ['date', 'patientName', 'clientName', 'clientPhone', 'title', 'documentType', 'notes', 'fileName', 'visibleInPortal', 'uploadStatus']

const TIMELINE_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'attention', label: 'Atenciones' },
  { key: 'prescription', label: 'Recetas' },
  { key: 'vaccine', label: 'Vacunas' },
  { key: 'file', label: 'PDF' },
  { key: 'appointment', label: 'Turnos' },
]

const TIMELINE_CATEGORY_LABELS = {
  attention: 'Atención',
  prescription: 'Receta',
  vaccine: 'Vacuna',
  file: 'PDF',
  appointment: 'Turno',
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeClinicalKind(value) {
  return value === 'Atención clínica' ? 'Atención' : value || 'Atención'
}

function buildClinicalCategories(item = {}) {
  return uniqueValues([
    'attention',
    item.hasPrescription || item.prescriptionText || item.source === 'prescriptions' ? 'prescription' : '',
    item.hasPrevention || item.source === 'vaccines' ? 'vaccine' : '',
    item.hasClinicalFile || item.clinicalFileId ? 'file' : '',
  ])
}

function withTimelineCategories(payload, categories) {
  const categoryTags = uniqueValues(categories)
  return {
    ...payload,
    categoryTags,
    categoryLabels: categoryTags.map((tag) => TIMELINE_CATEGORY_LABELS[tag] || tag),
  }
}

function countTimelineByFilter(timeline = [], filterKey = 'all') {
  if (filterKey === 'all') return timeline.length
  return timeline.filter((item) => item.categoryTags?.includes(filterKey)).length
}

const STAFF_ROLES = new Set(['admin', 'veterinario', 'recepcion', 'caja', 'stock', 'solo_lectura'])
const ROLE_LABELS = {
  admin: 'Administrador',
  veterinario: 'Veterinario/a',
  recepcion: 'Recepción',
  caja: 'Caja',
  stock: 'Stock / depósito',
  solo_lectura: 'Solo lectura',
}

function patientWhere(patientId) {
  return [{ field: 'patientId', op: '==', value: patientId || '__sin_paciente__' }]
}

function byDateDesc(a, b) {
  return String(b.date || b.nextDueDate || '').localeCompare(String(a.date || a.nextDueDate || ''))
}

function readable(value, fallback = '-') {
  return value === undefined || value === null || value === '' ? fallback : value
}

function trimFormValues(form) {
  return Object.entries(form).reduce((acc, [key, value]) => {
    acc[key] = typeof value === 'string' ? value.trim() : value
    return acc
  }, {})
}

function withSearch(payload, fields) {
  return {
    ...payload,
    ...buildSearchPayload(payload, fields),
  }
}

function buildTimeline({ clinicalRecords = [], vaccines = [], prescriptions = [], appointments = [], clinicalFiles = [] }) {
  const clinicalSourceKeys = new Set(
    clinicalRecords
      .filter((item) => item.source && item.sourceId)
      .map((item) => `${item.source}:${item.sourceId}`),
  )

  return [
    ...clinicalRecords.map((item) => withTimelineCategories({
      id: `clinical-${item.id}`,
      record: item,
      kind: normalizeClinicalKind(item.type),
      date: item.date,
      title: item.reason || item.title || item.type || 'Visita clínica',
      meta: item.professional ? `Atendió: ${item.professional}` : 'Profesional no informado',
      details: [
        item.diagnosis ? { label: 'Diagnóstico', value: item.diagnosis } : null,
        item.prescriptionText ? { label: item.source === 'prescriptions' ? 'Medicación / receta' : 'Medicación registrada', value: item.prescriptionText } : null,
        item.indications ? { label: item.source === 'vaccines' ? 'Datos de prevención' : item.source === 'prescriptions' ? 'Indicaciones para tutor' : 'Plan clínico / indicaciones', value: item.indications } : null,
        item.notes ? { label: item.source === 'vaccines' ? 'Observaciones' : 'Notas / evolución', value: item.notes } : null,
      ].filter(Boolean),
    }, buildClinicalCategories(item))),
    ...vaccines
      .filter((item) => !item.clinicalRecordId && !clinicalSourceKeys.has(`vaccines:${item.id}`))
      .map((item) => withTimelineCategories({
        id: `vaccine-${item.id}`,
        kind: 'Vacuna',
        date: item.date,
        title: item.vaccine || 'Aplicación sanitaria',
        meta: [item.professional ? `Aplicó: ${item.professional}` : '', item.batch ? `Lote: ${item.batch}` : ''].filter(Boolean).join(' · '),
        details: [
          item.nextDueDate ? { label: 'Próximo refuerzo', value: dateLabel(item.nextDueDate) } : null,
          item.notes ? { label: 'Notas', value: item.notes } : null,
        ].filter(Boolean),
      }, ['vaccine'])),
    ...prescriptions
      .filter((item) => !item.clinicalRecordId && !clinicalSourceKeys.has(`prescriptions:${item.id}`))
      .map((item) => withTimelineCategories({
        id: `prescription-${item.id}`,
        kind: 'Receta',
        date: item.date,
        title: item.medication || item.diagnosis || 'Receta / indicación',
        meta: item.professional ? `Profesional: ${item.professional}` : 'Profesional no informado',
        details: [
          item.diagnosis ? { label: 'Diagnóstico', value: item.diagnosis } : null,
          item.medication ? { label: 'Medicación', value: item.medication } : null,
          item.instructions ? { label: 'Indicaciones', value: item.instructions } : null,
          item.notes ? { label: 'Notas', value: item.notes } : null,
        ].filter(Boolean),
      }, ['prescription'])),
    ...appointments.map((item) => withTimelineCategories({
      id: `appointment-${item.id}`,
      kind: 'Turno',
      date: item.date,
      title: item.reason || item.type || item.service || 'Turno agendado',
      meta: [item.time, item.status].filter(Boolean).join(' · '),
      details: item.notes ? [{ label: 'Notas', value: item.notes }] : [],
    }, ['appointment'])),
    ...clinicalFiles.map((item) => withTimelineCategories({
      id: `file-${item.id}`,
      kind: 'PDF',
      date: item.date,
      title: item.title || item.fileName || 'Documento clínico',
      meta: [item.documentType, item.visibleInPortal ? 'Visible para tutor' : 'Solo interno'].filter(Boolean).join(' · '),
      details: [
        item.notes ? { label: 'Observaciones', value: item.notes } : null,
        item.fileName ? { label: 'Archivo', value: item.fileName } : null,
      ].filter(Boolean),
      file: item,
    }, ['file'])),
  ].sort(byDateDesc)
}

function buildFallbackClient(patient = {}) {
  return {
    id: patient.clientId || '',
    name: patient.clientName || '',
    phone: patient.clientPhone || '',
    email: patient.clientEmail || '',
  }
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return `54${digits.slice(1)}`
  return `54${digits}`
}

function buildPatientContextPayload(patient, client) {
  return {
    patientId: patient?.id || '',
    clientId: patient?.clientId || client?.id || '',
    clientName: client?.name || patient?.clientName || '',
    clientPhone: client?.phone || patient?.clientPhone || '',
    clientEmail: client?.email || patient?.clientEmail || '',
    patientName: patient?.name || '',
    patientSpecies: patient?.species || '',
    patientBreed: patient?.breed || '',
  }
}

function buildWhatsAppSummary({ patient, client, timeline }) {
  const recent = timeline.slice(0, 8)
  const lines = [
    `Historia clínica · ${patient?.name || 'Paciente'}`,
    `Tutor: ${client?.name || patient?.clientName || '-'}`,
    `Paciente: ${[patient?.species, patient?.breed, patient?.sex].filter(Boolean).join(' · ') || '-'}`,
    patient?.weight ? `Peso: ${patient.weight} kg` : '',
    patient?.allergies ? `Alergias: ${patient.allergies}` : '',
    patient?.alerts ? `Alertas: ${patient.alerts}` : '',
    '',
    'Últimos eventos:',
    ...recent.map((item) => {
      const details = item.details?.map((detail) => `${detail.label}: ${detail.value}`).join(' | ')
      return `- ${dateLabel(item.date)} · ${item.kind}: ${item.title}${item.meta ? ` · ${item.meta}` : ''}${details ? ` · ${details}` : ''}`
    }),
    '',
    'Los documentos PDF visibles también quedan disponibles en el portal de pacientes.',
  ]
  return lines.filter((line) => line !== '').join('\n')
}

function buildProfessionalOptions(users = []) {
  return users
    .filter((user) => user?.active !== false)
    .filter((user) => STAFF_ROLES.has(user?.role || ''))
    .map((user) => {
      const name = user.displayName || user.name || user.email || user.id
      const roleLabel = ROLE_LABELS[user.role] || user.role || 'Personal'
      return {
        value: name,
        label: `${name}${roleLabel ? ` · ${roleLabel}` : ''}`,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

function buildClinicalIndications(values) {
  const lines = []
  if (values.indications) lines.push(values.indications)
  if (values.addPrescription && values.prescriptionInstructions) {
    lines.push(`Indicaciones de receta: ${values.prescriptionInstructions}`)
  }
  if (values.addPrevention) {
    const preventionLines = [
      values.vaccine ? `Aplicación preventiva: ${values.vaccine}` : '',
      values.batch ? `Lote: ${values.batch}` : '',
      values.nextDueDate ? `Próximo refuerzo: ${dateLabel(values.nextDueDate)}` : '',
      values.vaccineStatus ? `Estado prevención: ${values.vaccineStatus}` : '',
    ].filter(Boolean)
    if (preventionLines.length) lines.push(preventionLines.join(' · '))
  }
  if (values.addPdf && values.pdfTitle) lines.push(`Documento adjunto: ${values.pdfTitle}`)
  return lines.join('\n\n')
}

function InfoTile({ label, value }) {
  return (
    <span>
      <strong>{label}</strong>
      {readable(value)}
    </span>
  )
}

function HistoryTimelineItem({ item, onOpenFile, openingFileId, onEdit, canEdit }) {
  const primaryCategory = item.categoryTags?.[0] || 'attention'

  return (
    <article className={`patient-history-item patient-history-item-${primaryCategory}`}>
      <div className="patient-history-item-head">
        <span className={`patient-history-kind patient-history-kind-${primaryCategory}`}>{item.kind}</span>
        <div className="patient-history-item-head-actions">
          <small>{dateLabel(item.date) || 'Sin fecha'}</small>
          {canEdit && item.record && (
            <button className="btn btn-small" type="button" onClick={() => onEdit(item.record)}>Editar</button>
          )}
        </div>
      </div>
      {!!item.categoryLabels?.length && (
        <div className="patient-history-kind-chips" aria-label="Tipos de evento">
          {item.categoryLabels.map((label, index) => (
            <span key={`${item.id}-${label}-${index}`}>{label}</span>
          ))}
        </div>
      )}
      <strong>{item.title}</strong>
      {item.meta && <em>{item.meta}</em>}
      {!!item.details?.length && (
        <dl className="patient-history-detail-list">
          {item.details.map((detail) => (
            <div key={`${item.id}-${detail.label}`}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {item.file?.storagePath && (
        <div className="patient-history-file-actions">
          <button className="btn btn-small" type="button" onClick={() => onOpenFile(item.file)} disabled={openingFileId === item.file.id}>
            {openingFileId === item.file.id ? 'Abriendo...' : 'Ver PDF'}
          </button>
          <span>{item.file.visibleInPortal ? 'Visible en portal' : 'Solo veterinaria'}</span>
        </div>
      )}
    </article>
  )
}

function initialUnifiedForm() {
  return {
    date: todayISO(),
    reason: '',
    professional: '',
    diagnosis: '',
    indications: '',
    notes: '',
    addPrescription: false,
    medication: '',
    prescriptionInstructions: '',
    prescriptionStatus: 'Activa',
    prescriptionNotes: '',
    addPrevention: false,
    nextDueDate: '',
    vaccine: '',
    batch: '',
    vaccineStatus: 'Aplicada',
    vaccineNotes: '',
    addPdf: false,
    pdfTitle: '',
    documentType: 'Informe externo',
    visibleInPortal: true,
    pdfNotes: '',
  }
}

export function PatientClinicalHistoryModal({ patient, onClose }) {
  const patientId = patient?.id || ''
  const where = useMemo(() => patientWhere(patientId), [patientId])
  const clinicalRecords = useCollection('clinicalRecords', { where, limitCount: 180 })
  const vaccines = useCollection('vaccines', { where, limitCount: 180 })
  const prescriptions = useCollection('prescriptions', { where, limitCount: 180 })
  const appointments = useCollection('appointments', { where, limitCount: 100 })
  const clinicalFiles = useCollection('clinicalFiles', { where, limitCount: 120 })
  const users = useCollection('users', { limitCount: 300, orderByField: 'displayName', orderDirection: 'asc' })
  const clinic = useClinicSettings()
  const { clientById } = useLookups()
  const { hasPermission } = useAuth()
  const canWriteClinical = hasPermission('clinica.write')
  const feedback = useFeedback()
  const formId = useId()
  const [saving, setSaving] = useState(false)
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [openingFileId, setOpeningFileId] = useState('')
  const [form, setForm] = useState(initialUnifiedForm)
  const [editingRecord, setEditingRecord] = useState(null)
  const [activePanel, setActivePanel] = useState('timeline')
  const [timelineFilter, setTimelineFilter] = useState('all')
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  const loading = clinicalRecords.loading || vaccines.loading || prescriptions.loading || appointments.loading || clinicalFiles.loading
  const error = clinicalRecords.error || vaccines.error || prescriptions.error || appointments.error || clinicalFiles.error
  const client = clientById[patient?.clientId] || buildFallbackClient(patient)
  const patientContext = useMemo(() => buildPatientContextPayload(patient, client), [patient, client])
  const professionalOptions = useMemo(() => buildProfessionalOptions(users.items), [users.items])
  const timeline = useMemo(() => buildTimeline({
    clinicalRecords: clinicalRecords.items,
    vaccines: vaccines.items,
    prescriptions: prescriptions.items,
    appointments: appointments.items,
    clinicalFiles: clinicalFiles.items,
  }), [clinicalRecords.items, vaccines.items, prescriptions.items, appointments.items, clinicalFiles.items])
  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return timeline
    return timeline.filter((item) => item.categoryTags?.includes(timelineFilter))
  }, [timeline, timelineFilter])

  function findLinkedPrescription(record) {
    if (!record?.id) return null
    return prescriptions.items.find((item) => item.id === record.prescriptionId)
      || prescriptions.items.find((item) => item.clinicalRecordId === record.id)
      || null
  }

  function findLinkedVaccine(record) {
    if (!record?.id) return null
    return vaccines.items.find((item) => item.id === record.vaccineId)
      || vaccines.items.find((item) => item.clinicalRecordId === record.id)
      || null
  }

  function findLinkedClinicalFile(record) {
    if (!record?.id) return null
    return clinicalFiles.items.find((item) => item.id === record.clinicalFileId)
      || clinicalFiles.items.find((item) => item.clinicalRecordId === record.id)
      || null
  }

  function resetClinicalForm() {
    setForm(initialUnifiedForm())
    setSelectedPdf(null)
    setEditingRecord(null)
  }

  function startNewAttention() {
    resetClinicalForm()
    setActivePanel('form')
  }

  function handleEditClinicalRecord(record) {
    const linkedPrescription = findLinkedPrescription(record)
    const linkedVaccine = findLinkedVaccine(record)
    const linkedFile = findLinkedClinicalFile(record)

    setForm({
      ...initialUnifiedForm(),
      date: record.date || todayISO(),
      reason: record.reason || record.title || '',
      professional: record.professional || '',
      diagnosis: record.diagnosis || '',
      indications: record.baseIndications || record.indications || '',
      notes: record.notes || '',
      addPrescription: Boolean(linkedPrescription || record.hasPrescription || record.prescriptionText),
      medication: linkedPrescription?.medication || record.prescriptionText || '',
      prescriptionInstructions: linkedPrescription?.instructions || '',
      prescriptionStatus: linkedPrescription?.status || 'Activa',
      prescriptionNotes: linkedPrescription?.notes || '',
      addPrevention: Boolean(linkedVaccine || record.hasPrevention),
      nextDueDate: linkedVaccine?.nextDueDate || '',
      vaccine: linkedVaccine?.vaccine || '',
      batch: linkedVaccine?.batch || '',
      vaccineStatus: linkedVaccine?.status || 'Aplicada',
      vaccineNotes: linkedVaccine?.notes || '',
      addPdf: Boolean(linkedFile || record.hasClinicalFile),
      pdfTitle: linkedFile?.title || '',
      documentType: linkedFile?.documentType || 'Informe externo',
      visibleInPortal: linkedFile ? Boolean(linkedFile.visibleInPortal) : true,
      pdfNotes: linkedFile?.notes || '',
    })
    setSelectedPdf(null)
    setEditingRecord(record)
    setActivePanel('form')
  }

  const baseFields = useMemo(() => [
    { name: 'date', label: 'Fecha de atención', type: 'date', required: true },
    {
      name: 'professional',
      label: 'Personal que atendió',
      type: 'select',
      options: professionalOptions,
      searchable: false,
      placeholder: 'Seleccionar personal',
      required: true,
      hint: users.loading ? 'Cargando personal del sistema...' : 'Seleccioná un usuario interno cargado en Sistema > Usuarios.',
    },
    { name: 'reason', label: 'Título / motivo de la visita', required: true, placeholder: 'Ej: Control postoperatorio, vómitos, tos, revisión general...' },
    { name: 'diagnosis', label: 'Diagnóstico', type: 'textarea', rows: 6, placeholder: 'Diagnóstico, hallazgos clínicos, impresión diagnóstica...' },
    { name: 'indications', label: 'Indicaciones clínicas / plan', type: 'textarea', rows: 6, placeholder: 'Estudios solicitados, controles, reposo, alimentación, cuidados o signos de alarma...' },
    { name: 'notes', label: 'Evolución / notas clínicas', type: 'textarea', rows: 7, placeholder: 'Espacio libre para que el veterinario pueda explayarse...' },
  ], [professionalOptions, users.loading])

  const prescriptionFields = useMemo(() => [
    { name: 'medication', label: 'Medicación / receta', type: 'textarea', rows: 5, placeholder: 'Medicamento, presentación, dosis, frecuencia, duración...' },
    { name: 'prescriptionInstructions', label: 'Indicaciones para el tutor', type: 'textarea', rows: 5, placeholder: 'Cómo administrar, cuidados, duración del tratamiento, controles y signos de alarma...' },
    { name: 'prescriptionStatus', label: 'Estado de receta', type: 'select', searchable: false, options: ['Activa', 'Finalizada', 'Anulada'] },
    { name: 'prescriptionNotes', label: 'Notas internas de receta', type: 'textarea', rows: 3 },
  ], [])

  const preventionFields = useMemo(() => [
    { name: 'vaccine', label: 'Vacuna / antiparasitario / prevención', placeholder: 'Ej: Séxtuple, antirrábica, pipeta, comprimido...' },
    { name: 'batch', label: 'Lote' },
    { name: 'nextDueDate', label: 'Próximo refuerzo', type: 'date' },
    { name: 'vaccineStatus', label: 'Estado de prevención', type: 'select', searchable: false, options: ['Aplicada', 'Programada', 'Vencida', 'Cancelada'] },
    { name: 'vaccineNotes', label: 'Observaciones de aplicación', type: 'textarea', rows: 4, placeholder: 'Reacción observada, recomendaciones posteriores o datos internos de la aplicación...' },
  ], [])

  const pdfFields = useMemo(() => [
    { name: 'pdfTitle', label: 'Título del PDF', placeholder: 'Ej: Análisis de sangre, ecografía, consentimiento...' },
    { name: 'documentType', label: 'Tipo de documento', type: 'select', searchable: false, options: ['Laboratorio', 'Radiografía', 'Ecografía', 'Consentimiento', 'Informe externo', 'Receta escaneada', 'Derivación', 'Otro'] },
    { name: 'visibleInPortal', label: 'Visible para el tutor en portal', type: 'checkbox' },
    { name: 'pdfNotes', label: 'Observaciones del PDF', type: 'textarea', rows: 4, placeholder: 'Detalle interno o explicación para identificar el documento...' },
  ], [])

  function refreshAll() {
    clinicalRecords.refresh?.()
    vaccines.refresh?.()
    prescriptions.refresh?.()
    appointments.refresh?.()
    clinicalFiles.refresh?.()
  }

  function handleFormChange(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function saveClinicalAttention() {
    const values = trimFormValues(form)
    const existingPrescription = editingRecord ? findLinkedPrescription(editingRecord) : null
    const existingVaccine = editingRecord ? findLinkedVaccine(editingRecord) : null
    const existingFile = editingRecord ? findLinkedClinicalFile(editingRecord) : null

    if (!values.reason) {
      feedback.warning('Indicá el motivo o título de la visita.')
      return
    }
    if (!values.professional) {
      feedback.warning('Seleccioná el personal que atendió.')
      return
    }
    if (values.addPrescription && !values.medication && !values.prescriptionInstructions) {
      feedback.warning('Si activás receta, indicá la medicación o las instrucciones para el tutor.')
      return
    }
    if (values.addPrevention && !values.vaccine) {
      feedback.warning('Si activás prevención, indicá la vacuna o antiparasitario aplicado.')
      return
    }
    if (values.addPdf) {
      if (!selectedPdf && !existingFile) {
        feedback.warning('Seleccioná un archivo PDF para subir.')
        return
      }
      if (selectedPdf && !isValidClinicalPdf(selectedPdf)) {
        feedback.warning('El archivo debe ser PDF y pesar como máximo 10 MB.')
        return
      }
      if (!values.pdfTitle) {
        feedback.warning('Indicá un título para identificar el PDF en la historia clínica.')
        return
      }
    }

    const clinicalPayload = withSearch({
      ...patientContext,
      date: values.date || todayISO(),
      type: 'Atención clínica',
      reason: values.reason,
      title: values.reason,
      professional: values.professional,
      diagnosis: values.diagnosis,
      prescriptionText: values.addPrescription ? values.medication : '',
      indications: buildClinicalIndications(values),
      baseIndications: values.indications,
      notes: values.notes,
      source: 'patientHistory',
      hasPrescription: Boolean(values.addPrescription),
      hasPrevention: Boolean(values.addPrevention),
      hasClinicalFile: Boolean(values.addPdf),
    }, clinicalSearchFields)

    const clinicalRecordId = editingRecord?.id
      ? editingRecord.id
      : await repository.createDocument('clinicalRecords', clinicalPayload)

    if (editingRecord?.id) {
      await repository.updateDocument('clinicalRecords', clinicalRecordId, clinicalPayload)
    }

    const linkedUpdates = {}

    if (values.addPrescription) {
      const prescriptionPayload = withSearch({
        ...patientContext,
        date: values.date || todayISO(),
        professional: values.professional,
        diagnosis: values.diagnosis,
        medication: values.medication,
        instructions: values.prescriptionInstructions,
        status: values.prescriptionStatus || 'Activa',
        notes: values.prescriptionNotes,
        clinicalRecordId,
      }, prescriptionSearchFields)
      if (existingPrescription?.id) {
        await repository.updateDocument('prescriptions', existingPrescription.id, prescriptionPayload)
        linkedUpdates.prescriptionId = existingPrescription.id
      } else {
        const prescriptionId = await repository.createDocument('prescriptions', prescriptionPayload)
        linkedUpdates.prescriptionId = prescriptionId
      }
    }

    if (values.addPrevention) {
      const vaccinePayload = withSearch({
        ...patientContext,
        date: values.date || todayISO(),
        nextDueDate: values.nextDueDate,
        vaccine: values.vaccine,
        batch: values.batch,
        professional: values.professional,
        status: values.vaccineStatus || 'Aplicada',
        notes: values.vaccineNotes,
        clinicalRecordId,
      }, vaccineSearchFields)
      if (existingVaccine?.id) {
        await repository.updateDocument('vaccines', existingVaccine.id, vaccinePayload)
        linkedUpdates.vaccineId = existingVaccine.id
      } else {
        const vaccineId = await repository.createDocument('vaccines', vaccinePayload)
        linkedUpdates.vaccineId = vaccineId
      }
    }

    if (values.addPdf) {
      const clinicalFilePayload = withSearch({
        ...patientContext,
        date: values.date || todayISO(),
        title: values.pdfTitle,
        documentType: values.documentType || 'Documento clínico',
        notes: values.pdfNotes,
        visibleInPortal: Boolean(values.visibleInPortal),
        fileName: selectedPdf?.name || existingFile?.fileName || 'documento.pdf',
        fileType: 'application/pdf',
        fileSize: selectedPdf?.size || existingFile?.fileSize || 0,
        storagePath: existingFile?.storagePath || '',
        uploadStatus: selectedPdf ? 'pending' : existingFile?.uploadStatus || 'ready',
        source: 'patientHistory',
        clinicalRecordId,
      }, clinicalFileSearchFields)

      if (existingFile?.id) {
        await repository.updateDocument('clinicalFiles', existingFile.id, clinicalFilePayload)
        if (selectedPdf) {
          const storagePath = await uploadClinicalPdf({
            file: selectedPdf,
            clientId: patientContext.clientId,
            patientId: patientContext.patientId,
            fileId: existingFile.id,
          })
          await repository.updateDocument('clinicalFiles', existingFile.id, {
            storagePath,
            uploadStatus: 'ready',
            fileName: selectedPdf.name || 'documento.pdf',
            fileSize: selectedPdf.size || 0,
          })
        }
        linkedUpdates.clinicalFileId = existingFile.id
      } else {
        const fileId = await repository.createDocument('clinicalFiles', clinicalFilePayload)
        try {
          const storagePath = await uploadClinicalPdf({
            file: selectedPdf,
            clientId: patientContext.clientId,
            patientId: patientContext.patientId,
            fileId,
          })
          await repository.updateDocument('clinicalFiles', fileId, {
            storagePath,
            uploadStatus: 'ready',
          })
          linkedUpdates.clinicalFileId = fileId
        } catch (error) {
          await repository.deleteDocument('clinicalFiles', fileId).catch(() => null)
          throw error
        }
      }
    }

    if (Object.keys(linkedUpdates).length) {
      await repository.updateDocument('clinicalRecords', clinicalRecordId, linkedUpdates)
    }

    resetClinicalForm()
    setActivePanel('timeline')
    feedback.success(editingRecord?.id ? 'Historia clínica actualizada.' : 'Atención guardada en la historia clínica del paciente.')
  }

  async function handleOpenClinicalFile(file) {
    setOpeningFileId(file?.id || '')
    try {
      const url = await getClinicalPdfUrl(file.storagePath)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo abrir el PDF.')
    } finally {
      setOpeningFileId('')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canWriteClinical) {
      feedback.warning('No tenés permiso para cargar historia clínica.')
      return
    }
    setSaving(true)
    try {
      await saveClinicalAttention()
      refreshAll()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la información clínica.')
    } finally {
      setSaving(false)
    }
  }

  function handlePrintHistory() {
    const printableClinicalRecords = clinicalRecords.items.filter((item) => !['prescriptions', 'vaccines'].includes(item.source))
    printClinicalHistoryDocument({
      clinic,
      client,
      patient,
      records: printableClinicalRecords,
      vaccines: vaccines.items,
      prescriptions: prescriptions.items,
      clinicalFiles: clinicalFiles.items,
    })
    feedback.info('Se abrió la impresión de historia clínica. Guardá como PDF desde el navegador.', 'Documento preparado')
  }

  function handleShareWhatsApp() {
    const message = buildWhatsAppSummary({ patient, client, timeline })
    const phone = normalizePhone(client?.phone || patient?.clientPhone)
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Modal
      title={`Historia clínica · ${patient?.name || 'Paciente'}`}
      size="xl"
      className="clinical-history-sheet"
      onClose={onClose}
      footer={(
        <>
          <button className="btn" type="button" onClick={handlePrintHistory}>PDF completo</button>
          <button className="btn btn-primary-soft" type="button" onClick={handleShareWhatsApp}>WhatsApp</button>
          <button className="btn" type="button" onClick={onClose}>Cerrar</button>
        </>
      )}
    >
      <div className="patient-history-modal">
        <div className="patient-clinical-actions" aria-label="Acciones rápidas de historia clínica">
          {canWriteClinical && (
            <button
              className={`btn ${activePanel === 'form' ? 'btn-primary' : ''}`}
              type="button"
              onClick={startNewAttention}
            >
              Nueva atención
            </button>
          )}
          <button
            className={`btn ${activePanel === 'timeline' ? 'btn-primary' : ''}`}
            type="button"
            onClick={() => setActivePanel('timeline')}
          >
            Timeline
          </button>
          <button className="btn" type="button" onClick={handlePrintHistory}>
            PDF
          </button>
          <button className="btn btn-primary-soft" type="button" onClick={handleShareWhatsApp}>
            WhatsApp
          </button>
        </div>

        <section className={`patient-history-summary ${summaryExpanded ? 'is-open' : 'is-collapsed'}`}>
          <div className="patient-history-summary-head">
            <div>
              <p className="eyebrow">Portal clínico propio del animal</p>
              <h3>{patient?.name}</h3>
              <p>{[patient?.species, patient?.breed, patient?.sex].filter(Boolean).join(' · ') || 'Sin datos principales'}</p>
            </div>
            <button
              className="btn btn-small patient-summary-toggle"
              type="button"
              onClick={() => setSummaryExpanded((current) => !current)}
              aria-expanded={summaryExpanded}
            >
              {summaryExpanded ? 'Ocultar datos' : 'Ver datos'}
            </button>
          </div>
          <div className="patient-history-summary-body">
            <div className="patient-history-meta">
              <InfoTile label="Responsable" value={client?.name || patient?.clientName} />
              <InfoTile label="Nacimiento" value={dateLabel(patient?.birthDate)} />
              <InfoTile label="Peso" value={patient?.weight ? `${patient.weight} kg` : ''} />
              <InfoTile label="Color" value={patient?.color} />
              <InfoTile label="Castración" value={patient?.castrationStatus || 'Indefinido'} />
              <InfoTile label="Microchip" value={patient?.chip} />
            </div>
            {(patient?.allergies || patient?.alerts) && (
              <div className="patient-history-alerts">
                {patient?.allergies && <span><strong>Alergias:</strong> {patient.allergies}</span>}
                {patient?.alerts && <span><strong>Alertas clínicas:</strong> {patient.alerts}</span>}
              </div>
            )}
          </div>
        </section>

        {canWriteClinical && activePanel === 'form' && (
          <section className="patient-history-quick panel-soft">
            <div className="patient-history-section-head">
              <div>
                <h4>{editingRecord ? 'Editar atención clínica' : 'Nueva atención clínica'}</h4>
                <p>Cada paciente tiene su historia propia. Desde acá el veterinario puede agregar o editar diagnóstico, indicaciones, receta, prevención y PDF sin salir del modal.</p>
              </div>
              <span>{patient?.name || 'Paciente'}</span>
            </div>

            <form id={formId} onSubmit={handleSubmit}>
              <section className="patient-history-form-block">
                <div className="patient-history-form-block-head">
                  <strong>Datos de la atención</strong>
                  <small>Información base de la visita clínica.</small>
                </div>
                <FormGrid value={form} onChange={handleFormChange} fields={baseFields} />
              </section>

              <section className="patient-history-form-block">
                <label className="patient-history-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(form.addPrescription)}
                    onChange={(event) => handleFormChange('addPrescription', event.target.checked)}
                  />
                  <span>
                    <strong>Agregar receta / medicación</strong>
                    <small>Activá este bloque si en la atención se indicó un tratamiento o receta.</small>
                  </span>
                </label>
                {form.addPrescription && <FormGrid value={form} onChange={handleFormChange} fields={prescriptionFields} />}
              </section>

              <section className="patient-history-form-block">
                <label className="patient-history-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(form.addPrevention)}
                    onChange={(event) => handleFormChange('addPrevention', event.target.checked)}
                  />
                  <span>
                    <strong>Agregar vacuna / antiparasitario / prevención</strong>
                    <small>Activá este bloque si se aplicó o programó una prevención sanitaria.</small>
                  </span>
                </label>
                {form.addPrevention && <FormGrid value={form} onChange={handleFormChange} fields={preventionFields} />}
              </section>

              <section className="patient-history-form-block">
                <label className="patient-history-toggle">
                  <input
                    type="checkbox"
                    checked={Boolean(form.addPdf)}
                    onChange={(event) => handleFormChange('addPdf', event.target.checked)}
                  />
                  <span>
                    <strong>Adjuntar PDF clínico</strong>
                    <small>Activá este bloque para subir análisis, ecografías, consentimientos o informes externos.</small>
                  </span>
                </label>
                {form.addPdf && (
                  <>
                    <FormGrid value={form} onChange={handleFormChange} fields={pdfFields} />
                    <label className="field patient-history-file-input">
                      <span>Archivo PDF</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => setSelectedPdf(event.target.files?.[0] || null)}
                      />
                      <small className="field-hint">Máximo {Math.round(MAX_CLINICAL_PDF_SIZE_BYTES / 1024 / 1024)} MB. Se guarda en Firebase Storage y se lista en la historia clínica.</small>
                      {selectedPdf && <small className="field-hint">Seleccionado: {selectedPdf.name} · {Math.round(selectedPdf.size / 1024)} KB</small>}
                    </label>
                  </>
                )}
              </section>

              <div className="patient-history-form-actions">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : editingRecord ? 'Guardar cambios en historia clínica' : 'Guardar atención en historia clínica'}
                </button>
                {editingRecord && (
                  <button className="btn" type="button" onClick={resetClinicalForm} disabled={saving}>Cancelar edición</button>
                )}
              </div>
            </form>
          </section>
        )}

        {activePanel === 'timeline' && (
          <section className="patient-history-main panel-soft">
            <div className="patient-history-section-head">
              <div>
                <h4>Historia unificada del paciente</h4>
                <p>Atenciones, diagnósticos, indicaciones, recetas, prevención sanitaria, turnos y documentos PDF vinculados al animal.</p>
              </div>
              <span>{timelineFilter === 'all' ? `${timeline.length} eventos` : `${filteredTimeline.length} de ${timeline.length}`}</span>
            </div>

            <div className="patient-history-filter-tabs" role="tablist" aria-label="Filtrar historia clínica">
              {TIMELINE_FILTERS.map((filter) => {
                const count = countTimelineByFilter(timeline, filter.key)
                return (
                  <button
                    key={filter.key}
                    className={timelineFilter === filter.key ? 'active' : ''}
                    type="button"
                    onClick={() => setTimelineFilter(filter.key)}
                    role="tab"
                    aria-selected={timelineFilter === filter.key}
                  >
                    {filter.label}
                    <span>{count}</span>
                  </button>
                )
              })}
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {loading && <div className="portal-empty-state">Cargando historia clínica...</div>}
            {!loading && !timeline.length && <div className="portal-empty-state"><strong>Sin eventos cargados</strong><span>Este animal todavía no tiene atenciones, vacunas, recetas, turnos ni documentos vinculados.</span></div>}
            {!loading && !!timeline.length && !filteredTimeline.length && (
              <div className="portal-empty-state"><strong>Sin resultados en este filtro</strong><span>No hay eventos de tipo {TIMELINE_FILTERS.find((filter) => filter.key === timelineFilter)?.label?.toLowerCase() || 'seleccionado'} para este paciente.</span></div>
            )}
            {!loading && filteredTimeline.map((item) => (
              <HistoryTimelineItem
                key={item.id}
                item={item}
                onOpenFile={handleOpenClinicalFile}
                openingFileId={openingFileId}
                onEdit={handleEditClinicalRecord}
                canEdit={canWriteClinical}
              />
            ))}
          </section>
        )}

        {canWriteClinical && activePanel === 'timeline' && (
          <button
            className="btn btn-primary patient-history-floating-action"
            type="button"
            onClick={startNewAttention}
          >
            + Nueva atención
          </button>
        )}
      </div>
    </Modal>
  )
}
