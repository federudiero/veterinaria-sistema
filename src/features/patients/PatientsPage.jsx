import React, { useState } from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel } from '../../utils/formatters.js'
import { patientContactExportColumns } from '../../utils/patientExportColumns.js'
import { withClientPatientLookupFields } from '../../utils/lookupPayload.js'
import { PatientClinicalHistoryModal } from './PatientClinicalHistoryModal.jsx'

function CastrationBadge({ value }) {
  const label = value || 'Indefinido'
  const tone = label === 'Castrado' ? 'success' : label === 'No castrado' ? 'warning' : 'info'
  return <span className={`badge tone-${tone}`}>{label}</span>
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return `54${digits.slice(1)}`
  return `54${digits}`
}

function openWhatsApp(phone, message = '') {
  const normalized = normalizePhone(phone)
  if (!normalized && !message) return
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  window.open(normalized ? `https://wa.me/${normalized}${text}` : `https://wa.me/${text}`, '_blank', 'noopener,noreferrer')
}

export function PatientsPage() {
  const { clientOptions, clientMap, clientById } = useLookups()
  const [historyPatient, setHistoryPatient] = useState(null)

  const columns = [
    { key: 'name', label: 'Paciente' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || row.clientName || '-' },
    { key: 'species', label: 'Especie' },
    { key: 'breed', label: 'Raza' },
    { key: 'birthDate', label: 'Nacimiento', render: (row) => dateLabel(row.birthDate) },
    { key: 'weight', label: 'Peso' },
    { key: 'castrationStatus', label: 'Castración', render: (row) => <CastrationBadge value={row.castrationStatus} /> },
    { key: 'status', label: 'Estado' },
    { key: 'alerts', label: 'Alertas clínicas' },
  ]

  function normalizePatientPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, clientById })
  }

  function patientClient(row) {
    return clientById[row.clientId] || {
      name: row.clientName || '',
      phone: row.clientPhone || '',
      email: row.clientEmail || '',
    }
  }

  return (
    <>
      <CrudPage
        collectionName="patients"
        eyebrow="Clínica"
        title="Pacientes"
        description="Ficha principal de cada mascota. En mobile la card prioriza tutor, especie, estado y acceso directo a historia clínica para trabajar en consultorio."
        createLabel="Nuevo paciente"
        searchFields={['name', 'clientName', 'clientPhone', 'clientEmail', 'species', 'breed', 'chip', 'allergies', 'alerts', 'status', 'castrationStatus']}
        searchPlaceholder="Buscar paciente por nombre, responsable, teléfono, especie, raza, chip, castración o alerta..."
        beforeSave={normalizePatientPayload}
        exportColumns={patientContactExportColumns({ clientById, baseColumns: columns })}
        initialValues={{ clientId: '', name: '', species: 'Canino', breed: '', sex: '', birthDate: '', weight: 0, color: '', castrationStatus: 'Indefinido', chip: '', allergies: '', alerts: '', status: 'Activo' }}
        fields={[
          { name: 'clientId', label: 'Cliente responsable', type: 'select', required: true, options: clientOptions, searchPlaceholder: 'Buscar responsable por nombre o teléfono...' },
          { name: 'name', label: 'Nombre del paciente', required: true, autoComplete: 'off', enterKeyHint: 'next' },
          { name: 'species', label: 'Especie', type: 'select', options: ['Canino', 'Felino', 'Ave', 'Exótico', 'Otro'] },
          { name: 'breed', label: 'Raza', autoComplete: 'off', enterKeyHint: 'next' },
          { name: 'sex', label: 'Sexo', type: 'select', options: ['Macho', 'Hembra', 'No informado'] },
          { name: 'birthDate', label: 'Fecha nacimiento', type: 'date' },
          { name: 'weight', label: 'Peso kg', type: 'number', inputMode: 'decimal', step: '0.01' },
          { name: 'color', label: 'Color', autoComplete: 'off' },
          { name: 'castrationStatus', label: 'Castración', type: 'select', options: ['Castrado', 'No castrado', 'Indefinido'] },
          { name: 'chip', label: 'Microchip', inputMode: 'numeric', autoComplete: 'off' },
          { name: 'allergies', label: 'Alergias', placeholder: 'Ej: penicilina, alimentos, picaduras...' },
          { name: 'status', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'Fallecido'] },
          { name: 'alerts', label: 'Alertas clínicas', type: 'textarea', placeholder: 'Alertas visibles en consultorio: agresivo, crónico, medicación actual, control pendiente...' },
        ]}
        enableTags
        columns={columns}
        mobile={{ title: 'name', subtitle: 'clientId', meta: ['species', 'status', 'castrationStatus', 'alerts'], maxMeta: 4, ariaLabel: 'Pacientes en mobile' }}
        extraRowActions={(row) => {
          const client = patientClient(row)
          return (
            <>
              <button className="btn btn-small btn-primary-soft" type="button" onClick={() => setHistoryPatient(row)}>
                Historia
              </button>
              {(client?.phone || row.clientPhone) && (
                <button
                  className="btn btn-small"
                  type="button"
                  onClick={() => openWhatsApp(client?.phone || row.clientPhone, `Hola ${client?.name || row.clientName || ''}, te escribimos por ${row.name || 'tu mascota'}.`)}
                >
                  WhatsApp tutor
                </button>
              )}
            </>
          )
        }}
      />

      {historyPatient && (
        <PatientClinicalHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
      )}
    </>
  )
}
