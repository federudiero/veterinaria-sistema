import React, { useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { SearchableSelect } from '../../components/forms/SearchableSelect.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { useLookups } from '../../hooks/useLookups.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { dateLabel, money } from '../../utils/formatters.js'
import {
  printAppointmentCertificate,
  printCashClosureDocument,
  printClinicalHistoryDocument,
  printCurrentAccountStatement,
  printPrescriptionDocument,
  printSaleReceipt,
  printVaccinationCard,
} from '../../utils/professionalDocuments.js'

const recentOptions = { limitCount: 300, orderByField: 'date', orderDirection: 'desc' }

function optionLabelById(options, id) {
  return options.find((item) => String(item.value) === String(id))?.label || ''
}

function buildSelectionOptions(rows, labelFactory) {
  return rows.map((row) => ({ value: row.id, label: labelFactory(row), row }))
}

export function DocumentsPage() {
  const clinic = useClinicSettings()
  const feedback = useFeedback()
  const {
    clientOptions,
    patientOptions,
    clientById,
    patientById,
    clientMap,
    patientMap,
  } = useLookups()

  const clinicalRecords = useCollection('clinicalRecords', recentOptions)
  const vaccines = useCollection('vaccines', recentOptions)
  const prescriptions = useCollection('prescriptions', recentOptions)
  const sales = useCollection('sales', recentOptions)
  const accounts = useCollection('currentAccounts', recentOptions)
  const closures = useCollection('cashClosures', { limitCount: 120, orderByField: 'date', orderDirection: 'desc' })
  const appointments = useCollection('appointments', recentOptions)

  const [patientId, setPatientId] = useState('')
  const [prescriptionId, setPrescriptionId] = useState('')
  const [saleId, setSaleId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [closureId, setClosureId] = useState('')
  const [appointmentId, setAppointmentId] = useState('')

  const patient = patientById[patientId]
  const client = patient ? clientById[patient.clientId] : null

  const patientClinicalRecords = useMemo(
    () => clinicalRecords.items.filter((item) => !patientId || item.patientId === patientId),
    [clinicalRecords.items, patientId],
  )
  const patientVaccines = useMemo(
    () => vaccines.items.filter((item) => !patientId || item.patientId === patientId),
    [vaccines.items, patientId],
  )
  const patientPrescriptions = useMemo(
    () => prescriptions.items.filter((item) => !patientId || item.patientId === patientId),
    [prescriptions.items, patientId],
  )

  const prescriptionOptions = buildSelectionOptions(prescriptions.items, (row) => `${dateLabel(row.date)} · ${patientMap[row.patientId] || 'Paciente'} · ${row.professional || 'Sin profesional'}`)
  const saleOptions = buildSelectionOptions(sales.items, (row) => `${dateLabel(row.date)} · ${clientMap[row.clientId] || row.clientName || 'Cliente'} · ${money(row.total || row.amount)}`)
  const accountOptions = buildSelectionOptions(accounts.items, (row) => `${dateLabel(row.date)} · ${clientMap[row.clientId] || 'Cliente'} · saldo ${money(row.balance ?? row.pendingAmount)}`)
  const closureOptions = buildSelectionOptions(closures.items, (row) => `${dateLabel(row.date)} · neto ${money(row.net)}`)
  const appointmentOptions = buildSelectionOptions(appointments.items, (row) => `${dateLabel(row.date)} ${row.time || ''} · ${patientMap[row.patientId] || 'Paciente'} · ${row.service || 'Servicio'}`)

  const selectedPrescription = prescriptions.items.find((item) => item.id === prescriptionId)
  const selectedSale = sales.items.find((item) => item.id === saleId)
  const selectedAccount = accounts.items.find((item) => item.id === accountId)
  const selectedClosure = closures.items.find((item) => item.id === closureId)
  const selectedAppointment = appointments.items.find((item) => item.id === appointmentId)

  function requirePatient() {
    if (!patient) {
      feedback.warning('Seleccioná un paciente para generar este documento.')
      return false
    }
    return true
  }

  function printHistory() {
    if (!requirePatient()) return
    printClinicalHistoryDocument({ clinic, client, patient, records: patientClinicalRecords, vaccines: patientVaccines, prescriptions: patientPrescriptions })
    feedback.info('Se abrió la impresión de historia clínica. Guardá como PDF desde el navegador.', 'Documento preparado')
  }

  function printVaccines() {
    if (!requirePatient()) return
    printVaccinationCard({ clinic, client, patient, vaccines: patientVaccines })
    feedback.info('Se abrió la impresión del carnet sanitario.', 'Documento preparado')
  }

  function printPrescription() {
    if (!selectedPrescription) {
      feedback.warning('Seleccioná una receta para imprimir.')
      return
    }
    const localPatient = patientById[selectedPrescription.patientId]
    const localClient = clientById[selectedPrescription.clientId] || clientById[localPatient?.clientId]
    printPrescriptionDocument({ clinic, client: localClient, patient: localPatient, prescription: selectedPrescription })
    feedback.info('Se abrió la impresión de receta profesional.', 'Documento preparado')
  }

  function printSale() {
    if (!selectedSale) {
      feedback.warning('Seleccioná una venta para imprimir el recibo.')
      return
    }
    const localPatient = patientById[selectedSale.patientId]
    const localClient = clientById[selectedSale.clientId] || clientById[localPatient?.clientId]
    printSaleReceipt({ clinic, client: localClient, patient: localPatient, sale: selectedSale })
    feedback.info('Se abrió la impresión del recibo de venta.', 'Documento preparado')
  }

  function printAccount() {
    if (!selectedAccount) {
      feedback.warning('Seleccioná una cuenta corriente para imprimir.')
      return
    }
    const localPatient = patientById[selectedAccount.patientId]
    const localClient = clientById[selectedAccount.clientId] || clientById[localPatient?.clientId]
    printCurrentAccountStatement({ clinic, client: localClient, patient: localPatient, account: selectedAccount })
    feedback.info('Se abrió la impresión del resumen de cuenta corriente.', 'Documento preparado')
  }

  function printClosure() {
    if (!selectedClosure) {
      feedback.warning('Seleccioná un cierre de caja para imprimir.')
      return
    }
    printCashClosureDocument({ clinic, closure: selectedClosure })
    feedback.info('Se abrió la impresión del cierre de caja.', 'Documento preparado')
  }

  function printAppointment() {
    if (!selectedAppointment) {
      feedback.warning('Seleccioná un turno para imprimir la constancia.')
      return
    }
    const localPatient = patientById[selectedAppointment.patientId]
    const localClient = clientById[selectedAppointment.clientId] || clientById[localPatient?.clientId]
    printAppointmentCertificate({ clinic, client: localClient, patient: localPatient, appointment: selectedAppointment })
    feedback.info('Se abrió la impresión de constancia.', 'Documento preparado')
  }

  const recentRows = [
    { id: 'history', document: 'Historia clínica', source: patient ? patient.name : 'Elegí paciente', detail: `${patientClinicalRecords.length} evoluciones`, action: 'PDF paciente' },
    { id: 'vaccines', document: 'Carnet sanitario', source: patient ? patient.name : 'Elegí paciente', detail: `${patientVaccines.length} aplicaciones`, action: 'PDF paciente' },
    { id: 'prescription', document: 'Receta', source: optionLabelById(prescriptionOptions, prescriptionId) || 'Elegí receta', detail: selectedPrescription?.status || '-', action: 'PDF receta' },
    { id: 'sale', document: 'Recibo de venta', source: optionLabelById(saleOptions, saleId) || 'Elegí venta', detail: selectedSale?.status || (selectedSale?.paid ? 'Pagada' : '-'), action: 'PDF recibo' },
    { id: 'account', document: 'Cuenta corriente', source: optionLabelById(accountOptions, accountId) || 'Elegí cuenta', detail: selectedAccount?.status || '-', action: 'PDF deuda' },
    { id: 'closure', document: 'Cierre de caja', source: optionLabelById(closureOptions, closureId) || 'Elegí cierre', detail: selectedClosure ? money(selectedClosure.net) : '-', action: 'PDF caja' },
  ]

  return (
    <section>
      <SectionHeader
        eyebrow="Operación profesional"
        title="Centro de documentos"
        description="Generación de documentos listos para entregar: historia clínica, carnet sanitario, recetas, recibos, cuentas corrientes, cierres de caja y constancias. Los datos salen del contacto, paciente y operaciones cargadas en el sistema."
      />

      <div className="stats-grid compact">
        <StatCard label="Pacientes disponibles" value={patientOptions.length} tone="info" />
        <StatCard label="Recetas recientes" value={prescriptions.items.length} />
        <StatCard label="Ventas recientes" value={sales.items.length} tone="success" />
      </div>

      <div className="document-grid">
        <article className="panel document-panel featured-document-panel">
          <div className="panel-title-row">
            <div>
              <h2>Documentos clínicos por paciente</h2>
              <p className="muted">Seleccioná el paciente y generá documentos con responsable, datos clínicos y firma profesional.</p>
            </div>
          </div>
          <SearchableSelect
            label="Paciente"
            value={patientId}
            onChange={setPatientId}
            options={patientOptions}
            placeholder="Seleccionar paciente"
            searchPlaceholder="Buscar paciente o responsable..."
          />
          <div className="document-actions-grid">
            <button className="btn btn-primary" type="button" onClick={printHistory}>Historia clínica completa</button>
            <button className="btn" type="button" onClick={printVaccines}>Carnet sanitario</button>
          </div>
          {patient && (
            <div className="profile-mini-card">
              <strong>{patient.name}</strong>
              <span>{patient.species || '-'} · {patient.breed || '-'} · Responsable: {client?.name || '-'}</span>
              <span>{client?.phone || 'Sin teléfono'} · {client?.email || 'Sin email'}</span>
            </div>
          )}
        </article>

        <article className="panel document-panel">
          <h2>Recetas e indicaciones</h2>
          <SearchableSelect
            label="Receta"
            value={prescriptionId}
            onChange={setPrescriptionId}
            options={prescriptionOptions}
            placeholder="Seleccionar receta"
            searchPlaceholder="Buscar receta por fecha, paciente o profesional..."
          />
          <button className="btn btn-primary full" type="button" onClick={printPrescription}>Imprimir receta profesional</button>
        </article>

        <article className="panel document-panel">
          <h2>Ventas y comprobantes</h2>
          <SearchableSelect
            label="Venta"
            value={saleId}
            onChange={setSaleId}
            options={saleOptions}
            placeholder="Seleccionar venta"
            searchPlaceholder="Buscar venta por fecha, cliente o importe..."
          />
          <button className="btn btn-primary full" type="button" onClick={printSale}>Imprimir recibo</button>
        </article>

        <article className="panel document-panel">
          <h2>Cuentas corrientes</h2>
          <SearchableSelect
            label="Cuenta"
            value={accountId}
            onChange={setAccountId}
            options={accountOptions}
            placeholder="Seleccionar cuenta corriente"
            searchPlaceholder="Buscar cuenta por fecha, cliente o saldo..."
          />
          <button className="btn btn-primary full" type="button" onClick={printAccount}>Imprimir resumen de deuda</button>
        </article>

        <article className="panel document-panel">
          <h2>Cierres de caja</h2>
          <SearchableSelect
            label="Cierre"
            value={closureId}
            onChange={setClosureId}
            options={closureOptions}
            placeholder="Seleccionar cierre"
            searchPlaceholder="Buscar cierre por fecha o importe..."
          />
          <button className="btn btn-primary full" type="button" onClick={printClosure}>Imprimir cierre</button>
        </article>

        <article className="panel document-panel">
          <h2>Constancia de atención</h2>
          <SearchableSelect
            label="Turno / atención"
            value={appointmentId}
            onChange={setAppointmentId}
            options={appointmentOptions}
            placeholder="Seleccionar turno"
            searchPlaceholder="Buscar turno por fecha, paciente o servicio..."
          />
          <button className="btn btn-primary full" type="button" onClick={printAppointment}>Imprimir constancia</button>
        </article>
      </div>

      <article className="panel">
        <h2>Resumen de documentos preparados</h2>
        <DataTable
          rows={recentRows}
          columns={[
            { key: 'document', label: 'Documento' },
            { key: 'source', label: 'Origen' },
            { key: 'detail', label: 'Detalle' },
            { key: 'action', label: 'Acción' },
          ]}
        />
      </article>
    </section>
  )
}
