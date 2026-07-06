import React, { useMemo, useState } from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { dateLabel } from '../../utils/formatters.js'
import { PatientClinicalHistoryModal } from '../patients/PatientClinicalHistoryModal.jsx'

function buildPatientSummary(patient = {}) {
  const parts = [patient.species, patient.breed, patient.sex].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Sin datos de especie/raza'
}

function PatientStatusBadge({ value }) {
  const label = value || 'Sin estado'
  const tone = label === 'Activo' ? 'success' : label === 'Fallecido' ? 'danger' : 'info'
  return <span className={`badge tone-${tone}`}>{label}</span>
}

function ClientPatientsModal({ client, onClose, onOpenHistory }) {
  const patients = useCollection('patients', {
    where: [{ field: 'clientId', op: '==', value: client?.id || '' }],
    limitCount: 250,
  })

  const sortedPatients = useMemo(() => {
    return [...(patients.items || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es'))
  }, [patients.items])

  return (
    <Modal
      title={`Pacientes de ${client?.name || 'cliente'}`}
      size="xl"
      onClose={onClose}
      footer={<button className="btn" type="button" onClick={onClose}>Cerrar</button>}
    >
      <section className="client-patients-modal">
        <div className="client-patients-owner-card">
          <div>
            <span className="eyebrow">Tutor responsable</span>
            <h3>{client?.name || '-'}</h3>
          </div>
          <div className="client-patients-owner-grid">
            <span><strong>Teléfono</strong>{client?.phone || '-'}</span>
            <span><strong>Email</strong>{client?.email || '-'}</span>
            <span><strong>Dirección</strong>{client?.address || '-'}</span>
            <span><strong>Segmento</strong>{client?.segment || '-'}</span>
          </div>
        </div>

        <div className="client-patients-section-head">
          <div>
            <h4>Pacientes asociados</h4>
            <p>Animales vinculados a este tutor. Desde acá podés abrir la historia clínica de cada uno.</p>
          </div>
          <span className="client-patients-count">{sortedPatients.length} paciente{sortedPatients.length === 1 ? '' : 's'}</span>
        </div>

        {patients.loading ? (
          <div className="panel-soft">Cargando pacientes asociados...</div>
        ) : patients.error ? (
          <div className="alert alert-danger">{patients.error}</div>
        ) : sortedPatients.length === 0 ? (
          <div className="client-patients-empty">
            <strong>No hay pacientes asociados.</strong>
            <span>Cuando cargues un paciente con este tutor responsable, va a aparecer en este detalle.</span>
          </div>
        ) : (
          <div className="client-patients-grid">
            {sortedPatients.map((patient) => (
              <article key={patient.id} className="client-patient-card">
                <div className="client-patient-card-head">
                  <div>
                    <span className="client-patient-kind">Paciente</span>
                    <h5>{patient.name || 'Sin nombre'}</h5>
                    <p>{buildPatientSummary(patient)}</p>
                  </div>
                  <PatientStatusBadge value={patient.status} />
                </div>

                <dl className="client-patient-details">
                  <div>
                    <dt>Nacimiento</dt>
                    <dd>{dateLabel(patient.birthDate)}</dd>
                  </div>
                  <div>
                    <dt>Peso</dt>
                    <dd>{patient.weight ? `${patient.weight} kg` : '-'}</dd>
                  </div>
                  <div>
                    <dt>Color</dt>
                    <dd>{patient.color || '-'}</dd>
                  </div>
                  <div>
                    <dt>Castración</dt>
                    <dd>{patient.castrationStatus || 'Indefinido'}</dd>
                  </div>
                  <div>
                    <dt>Microchip</dt>
                    <dd>{patient.chip || '-'}</dd>
                  </div>
                  <div>
                    <dt>Alergias</dt>
                    <dd>{patient.allergies || '-'}</dd>
                  </div>
                </dl>

                {patient.alerts && (
                  <div className="client-patient-alert">
                    <strong>Alertas clínicas</strong>
                    <span>{patient.alerts}</span>
                  </div>
                )}

                <div className="client-patient-actions">
                  <button className="btn btn-small btn-primary" type="button" onClick={() => onOpenHistory(patient)}>
                    Ver historia
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </Modal>
  )
}

export function ClientsPage() {
  const [patientsClient, setPatientsClient] = useState(null)
  const [historyPatient, setHistoryPatient] = useState(null)

  return (
    <>
      <CrudPage
        collectionName="clients"
        eyebrow="Maestros"
        title="Clientes"
        description="Dueños, datos de contacto, dirección, segmento y observaciones comerciales. Desde cada cliente podés ver sus pacientes asociados y abrir la historia clínica del animal."
        createLabel="Nuevo cliente"
        searchFields={['name', 'phone', 'email', 'dni', 'address', 'city', 'segment', 'notes']}
        searchPlaceholder="Buscar cliente por nombre, DNI/CUIT, teléfono, email, ciudad o segmento..."
        initialValues={{ name: '', dni: '', phone: '', email: '', address: '', city: '', segment: 'Nuevo', notes: '' }}
        fields={[
          { name: 'name', label: 'Nombre completo', required: true },
          { name: 'dni', label: 'DNI / CUIT' },
          { name: 'phone', label: 'Teléfono' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'address', label: 'Dirección' },
          { name: 'city', label: 'Ciudad' },
          { name: 'segment', label: 'Segmento', type: 'select', options: ['Nuevo', 'Frecuente', 'Cuenta corriente', 'VIP', 'Inactivo'] },
          { name: 'notes', label: 'Notas', type: 'textarea' },
        ]}
        enableTags
        columns={[
          { key: 'name', label: 'Cliente' },
          { key: 'phone', label: 'Teléfono' },
          { key: 'email', label: 'Email' },
          { key: 'address', label: 'Dirección' },
          { key: 'segment', label: 'Segmento' },
        ]}
        extraRowActions={(row) => (
          <button className="btn btn-small btn-primary-soft" type="button" onClick={() => setPatientsClient(row)}>
            Pacientes
          </button>
        )}
      />

      {patientsClient && (
        <ClientPatientsModal
          client={patientsClient}
          onClose={() => setPatientsClient(null)}
          onOpenHistory={(patient) => setHistoryPatient(patient)}
        />
      )}

      {historyPatient && (
        <PatientClinicalHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
      )}
    </>
  )
}
