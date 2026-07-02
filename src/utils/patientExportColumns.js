import { dateLabel } from './formatters.js'

function clientOf(row, clientById, patientById) {
  const patient = row.patientId ? patientById[row.patientId] : null
  return clientById[row.clientId] || clientById[patient?.clientId] || null
}

function patientOf(row, patientById) {
  return row.patientId ? patientById[row.patientId] : null
}

function hasLabel(columns, label) {
  const normalized = String(label || '').trim().toLowerCase()
  return columns.some((column) => String(column.label || '').trim().toLowerCase() === normalized)
}

function addIfMissing(columns, column) {
  return hasLabel(columns, column.label) ? columns : [...columns, column]
}

export function patientContactExportColumns({ clientById = {}, patientById = {}, baseColumns = [] }) {
  let columns = [...baseColumns]

  columns = addIfMissing(columns, { key: 'exportClientName', label: 'Contacto / responsable', exportValue: (row) => clientOf(row, clientById, patientById)?.name || '-' })
  columns = addIfMissing(columns, { key: 'exportClientPhone', label: 'Teléfono contacto', exportValue: (row) => clientOf(row, clientById, patientById)?.phone || '-' })
  columns = addIfMissing(columns, { key: 'exportClientEmail', label: 'Email contacto', exportValue: (row) => clientOf(row, clientById, patientById)?.email || '-' })
  columns = addIfMissing(columns, { key: 'exportClientDni', label: 'DNI / CUIT contacto', exportValue: (row) => clientOf(row, clientById, patientById)?.dni || '-' })
  columns = addIfMissing(columns, { key: 'exportClientAddress', label: 'Dirección contacto', exportValue: (row) => clientOf(row, clientById, patientById)?.address || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientName', label: 'Paciente', exportValue: (row) => patientOf(row, patientById)?.name || row.name || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientSpecies', label: 'Especie', exportValue: (row) => patientOf(row, patientById)?.species || row.species || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientBreed', label: 'Raza', exportValue: (row) => patientOf(row, patientById)?.breed || row.breed || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientSex', label: 'Sexo', exportValue: (row) => patientOf(row, patientById)?.sex || row.sex || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientBirthDate', label: 'Nacimiento paciente', exportValue: (row) => dateLabel(patientOf(row, patientById)?.birthDate || row.birthDate) })
  columns = addIfMissing(columns, { key: 'exportPatientWeight', label: 'Peso paciente', exportValue: (row) => patientOf(row, patientById)?.weight || row.weight || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientChip', label: 'Microchip', exportValue: (row) => patientOf(row, patientById)?.chip || row.chip || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientAllergies', label: 'Alergias', exportValue: (row) => patientOf(row, patientById)?.allergies || row.allergies || '-' })
  columns = addIfMissing(columns, { key: 'exportPatientAlerts', label: 'Alertas clínicas', exportValue: (row) => patientOf(row, patientById)?.alerts || row.alerts || '-' })

  return columns
}
