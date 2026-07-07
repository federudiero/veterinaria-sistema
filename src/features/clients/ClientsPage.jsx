import React, { useMemo, useState } from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { useCollection } from '../../hooks/useCollection.js'
<<<<<<< HEAD
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
=======
import { PatientClinicalHistoryModal } from '../patients/PatientClinicalHistoryModal.jsx'
import { dateLabel } from '../../utils/formatters.js'

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('54')) return digits
  if (digits.startsWith('0')) return `54${digits.slice(1)}`
  return `54${digits}`
}

function openWhatsApp(phone, message = '') {
  const normalized = normalizePhone(phone)
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  const url = normalized ? `https://wa.me/${normalized}${text}` : `https://wa.me/${text}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ClientInfoTile({ label, value }) {
  return (
    <span>
      <strong>{label}</strong>
      {value || '-'}
    </span>
  )
}

function ClientPatientsModal({ client, onClose, onOpenHistory }) {
  const where = useMemo(() => [{ field: 'clientId', op: '==', value: client?.id || '__sin_cliente__' }], [client?.id])
  const patients = useCollection('patients', { where, limitCount: 150, orderByField: 'name', orderDirection: 'asc' })

  function handleOpenHistory(patient) {
    onClose()
    onOpenHistory(patient)
  }

  return (
    <Modal
      title={`Cliente · ${client?.name || 'Detalle'}`}
      size="lg"
      onClose={onClose}
      footer={(
        <>
          {client?.phone && (
            <button className="btn btn-primary-soft" type="button" onClick={() => openWhatsApp(client.phone, `Hola ${client.name || ''}, te escribimos de la veterinaria.`)}>
              WhatsApp
            </button>
          )}
          <button className="btn" type="button" onClick={onClose}>Cerrar</button>
        </>
      )}
    >
      <div className="client-mobile-detail">
        <section className="client-detail-summary">
          <div>
            <p className="eyebrow">Ficha del tutor</p>
            <h3>{client?.name || '-'}</h3>
            <p>{[client?.segment, client?.city].filter(Boolean).join(' · ') || 'Sin segmento asignado'}</p>
          </div>
          <div className="client-detail-meta">
            <ClientInfoTile label="Teléfono" value={client?.phone} />
            <ClientInfoTile label="Email" value={client?.email} />
            <ClientInfoTile label="DNI / CUIT" value={client?.dni} />
            <ClientInfoTile label="Dirección" value={client?.address} />
          </div>
          {client?.notes && (
            <div className="client-detail-notes">
              <strong>Notas</strong>
              <p>{client.notes}</p>
            </div>
          )}
        </section>

        <section className="panel-soft client-patients-panel">
          <div className="patient-history-section-head">
            <div>
              <h4>Pacientes asociados</h4>
              <p>Desde esta ficha podés abrir la historia clínica del animal sin volver al listado.</p>
            </div>
            <span>{patients.items.length} pacientes</span>
          </div>

          {patients.error && <div className="alert alert-danger">{patients.error}</div>}
          {patients.loading && <div className="portal-empty-state">Cargando pacientes del cliente...</div>}
          {!patients.loading && patients.items.length === 0 && (
            <div className="portal-empty-state">
              <strong>Sin pacientes asociados</strong>
              <span>Este tutor todavía no tiene animales vinculados.</span>
            </div>
          )}
          {!patients.loading && patients.items.map((patient) => (
            <article key={patient.id} className="client-patient-card">
              <div>
                <strong>{patient.name || 'Paciente sin nombre'}</strong>
                <span>{[patient.species, patient.breed, patient.sex].filter(Boolean).join(' · ') || 'Sin datos clínicos básicos'}</span>
              </div>
              <div className="client-patient-meta">
                <span>Estado: <b>{patient.status || '-'}</b></span>
                <span>Nacimiento: <b>{dateLabel(patient.birthDate) || '-'}</b></span>
                <span>Castración: <b>{patient.castrationStatus || 'Indefinido'}</b></span>
              </div>
              {(patient.allergies || patient.alerts) && (
                <div className="client-patient-alerts">
                  {patient.allergies && <span><strong>Alergias:</strong> {patient.allergies}</span>}
                  {patient.alerts && <span><strong>Alertas:</strong> {patient.alerts}</span>}
                </div>
              )}
              <div className="client-patient-actions">
                <button className="btn btn-small btn-primary" type="button" onClick={() => handleOpenHistory(patient)}>Historia</button>
                {client?.phone && (
                  <button className="btn btn-small" type="button" onClick={() => openWhatsApp(client.phone, `Hola ${client.name || ''}, te escribimos por ${patient.name || 'tu mascota'}.`)}>
                    WhatsApp tutor
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
>>>>>>> dc56ca7 (primer subida)
    </Modal>
  )
}

export function ClientsPage() {
<<<<<<< HEAD
  const [patientsClient, setPatientsClient] = useState(null)
  const [historyPatient, setHistoryPatient] = useState(null)

=======
  const [detailClient, setDetailClient] = useState(null)
  const [historyPatient, setHistoryPatient] = useState(null)

  const columns = [
    { key: 'name', label: 'Cliente' },
    { key: 'phone', label: 'Teléfono' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Dirección' },
    { key: 'segment', label: 'Segmento' },
  ]

>>>>>>> dc56ca7 (primer subida)
  return (
    <>
      <CrudPage
        collectionName="clients"
        eyebrow="Maestros"
        title="Clientes"
<<<<<<< HEAD
        description="Dueños, datos de contacto, dirección, segmento y observaciones comerciales. Desde cada cliente podés ver sus pacientes asociados y abrir la historia clínica del animal."
=======
        description="Dueños, datos de contacto, dirección, segmento y observaciones comerciales. En mobile podés tocar Ver pacientes para abrir rápido los animales asociados e ingresar a su historia clínica."
>>>>>>> dc56ca7 (primer subida)
        createLabel="Nuevo cliente"
        searchFields={['name', 'phone', 'email', 'dni', 'address', 'city', 'segment', 'notes']}
        searchPlaceholder="Buscar cliente por nombre, DNI/CUIT, teléfono, email, ciudad o segmento..."
        initialValues={{ name: '', dni: '', phone: '', email: '', address: '', city: '', segment: 'Nuevo', notes: '' }}
        fields={[
<<<<<<< HEAD
          { name: 'name', label: 'Nombre completo', required: true },
          { name: 'dni', label: 'DNI / CUIT' },
          { name: 'phone', label: 'Teléfono' },
          { name: 'email', label: 'Email', type: 'email' },
          { name: 'address', label: 'Dirección' },
          { name: 'city', label: 'Ciudad' },
=======
          { name: 'name', label: 'Nombre completo', required: true, autoComplete: 'name', enterKeyHint: 'next' },
          { name: 'dni', label: 'DNI / CUIT', inputMode: 'numeric', autoComplete: 'off', enterKeyHint: 'next' },
          { name: 'phone', label: 'Teléfono', inputMode: 'tel', autoComplete: 'tel', enterKeyHint: 'next' },
          { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', enterKeyHint: 'next' },
          { name: 'address', label: 'Dirección', autoComplete: 'street-address', enterKeyHint: 'next' },
          { name: 'city', label: 'Ciudad', autoComplete: 'address-level2', enterKeyHint: 'next' },
>>>>>>> dc56ca7 (primer subida)
          { name: 'segment', label: 'Segmento', type: 'select', options: ['Nuevo', 'Frecuente', 'Cuenta corriente', 'VIP', 'Inactivo'] },
          { name: 'notes', label: 'Notas', type: 'textarea' },
        ]}
        enableTags
<<<<<<< HEAD
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
=======
        columns={columns}
        mobile={{ title: 'name', subtitle: 'phone', meta: ['segment', 'email', 'address'], maxMeta: 3, ariaLabel: 'Clientes en mobile' }}
        extraRowActions={(row) => (
          <>
            <button className="btn btn-small btn-primary-soft" type="button" onClick={() => setDetailClient(row)}>
              Ver pacientes
            </button>
            {row.phone && (
              <button className="btn btn-small" type="button" onClick={() => openWhatsApp(row.phone, `Hola ${row.name || ''}, te escribimos de la veterinaria.`)}>
                WhatsApp
              </button>
            )}
          </>
        )}
      />

      {detailClient && (
        <ClientPatientsModal
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onOpenHistory={setHistoryPatient}
>>>>>>> dc56ca7 (primer subida)
        />
      )}

      {historyPatient && (
        <PatientClinicalHistoryModal patient={historyPatient} onClose={() => setHistoryPatient(null)} />
      )}
    </>
  )
}
