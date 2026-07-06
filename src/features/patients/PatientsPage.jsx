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

export function PatientsPage() {
  const { clientOptions, clientMap, clientById } = useLookups()
  const [historyPatient, setHistoryPatient] = useState(null)

  const columns = [
    { key: 'name', label: 'Paciente' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'species', label: 'Especie' },
    { key: 'breed', label: 'Raza' },
    { key: 'birthDate', label: 'Nacimiento', render: (row) => dateLabel(row.birthDate) },
    { key: 'weight', label: 'Peso' },
    { key: 'castrationStatus', label: 'Castración', render: (row) => <CastrationBadge value={row.castrationStatus} /> },
    { key: 'status', label: 'Estado' },
  ]

  function normalizePatientPayload(payload) {
    return withClientPatientLookupFields(payload, { clientMap, clientById })
  }

  return (
    <>
      <CrudPage
        collectionName="patients"
        eyebrow="Clínica"
        title="Pacientes"
        description="Ficha principal de cada mascota. La historia clínica vive dentro del botón Historia de cada paciente: desde ese modal se cargan atenciones, diagnósticos, indicaciones, recetas, vacunas y PDF/WhatsApp."
        createLabel="Nuevo paciente"
        searchFields={['name', 'clientName', 'clientPhone', 'clientEmail', 'species', 'breed', 'chip', 'allergies', 'alerts', 'status', 'castrationStatus']}
        searchPlaceholder="Buscar paciente por nombre, responsable, teléfono, especie, raza, chip, castración o alerta..."
        beforeSave={normalizePatientPayload}
        exportColumns={patientContactExportColumns({ clientById, baseColumns: columns })}
        initialValues={{ clientId: '', name: '', species: 'Canino', breed: '', sex: '', birthDate: '', weight: 0, color: '', castrationStatus: 'Indefinido', chip: '', allergies: '', alerts: '', status: 'Activo' }}
        fields={[
          { name: 'clientId', label: 'Cliente responsable', type: 'select', required: true, options: clientOptions },
          { name: 'name', label: 'Nombre del paciente', required: true },
          { name: 'species', label: 'Especie', type: 'select', options: ['Canino', 'Felino', 'Ave', 'Exótico', 'Otro'] },
          { name: 'breed', label: 'Raza' },
          { name: 'sex', label: 'Sexo', type: 'select', options: ['Macho', 'Hembra', 'No informado'] },
          { name: 'birthDate', label: 'Fecha nacimiento', type: 'date' },
          { name: 'weight', label: 'Peso kg', type: 'number' },
          { name: 'color', label: 'Color' },
          { name: 'castrationStatus', label: 'Castración', type: 'select', options: ['Castrado', 'No castrado', 'Indefinido'] },
          { name: 'chip', label: 'Microchip' },
          { name: 'allergies', label: 'Alergias' },
          { name: 'status', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo', 'Fallecido'] },
          { name: 'alerts', label: 'Alertas clínicas', type: 'textarea' },
        ]}
        enableTags
        columns={columns}
        extraRowActions={(row) => (
          <button className="btn btn-small btn-primary-soft" type="button" onClick={() => setHistoryPatient(row)}>
            Historia
          </button>
        )}
      />

      {historyPatient && (
        <PatientClinicalHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
      )}
    </>
  )
}
