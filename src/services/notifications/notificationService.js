import { repository } from '../repositories/repositoryFactory.js'

export function nowISO() {
  return new Date().toISOString()
}

export function todayISO() {
  const value = new Date()
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function patientSnapshot(patient = {}) {
  return {
    patientId: patient.id || patient.patientId || '',
    patientName: patient.name || patient.patientName || '',
    patientSpecies: patient.species || '',
    patientBreed: patient.breed || '',
    patientSex: patient.sex || '',
    patientBirthDate: patient.birthDate || '',
    patientWeight: patient.weight || '',
    patientColor: patient.color || '',
    patientCastrationStatus: patient.castrationStatus || 'Indefinido',
    patientChip: patient.chip || '',
    patientAllergies: patient.allergies || '',
    patientAlerts: patient.alerts || '',
    patientStatus: patient.status || '',
  }
}

export function formatPatientSummary(patient = {}) {
  const parts = [
    patient.name || patient.patientName,
    patient.species || patient.patientSpecies,
    patient.breed || patient.patientBreed,
    patient.sex || patient.patientSex,
    patient.weight || patient.patientWeight ? `${patient.weight || patient.patientWeight} kg` : '',
    patient.castrationStatus || patient.patientCastrationStatus,
  ].filter(Boolean)
  return parts.join(' · ')
}

export function buildPortalConsultationPayload({ user, patient, form }) {
  const createdAtISO = nowISO()
  const snapshot = patientSnapshot(patient)
  const title = String(form?.subject || '').trim() || String(form?.reason || '').trim() || 'Consulta del tutor'
  const message = String(form?.message || '').trim()
  const clientName = patient.clientName || user?.displayName || user?.email || 'Tutor portal'
  const clientEmail = form?.contactEmail || patient.clientEmail || user?.email || ''

  return {
    date: todayISO(),
    createdAtISO,
    source: 'portal',
    status: 'Nueva',
    urgency: form?.urgency || 'Normal',
    subject: title,
    reason: String(form?.reason || '').trim(),
    message,
    preferredChannel: form?.preferredChannel || 'WhatsApp',
    contactPhone: String(form?.contactPhone || patient.clientPhone || '').trim(),
    contactEmail: String(clientEmail || '').trim(),
    portalUserUid: user?.uid || '',
    portalUserEmail: user?.email || '',
    clientId: patient.clientId || '',
    clientName,
    clientEmail: String(clientEmail || '').trim(),
    ...snapshot,
    searchTitle: `${title} ${message} ${snapshot.patientName} ${clientName}`,
  }
}

export function buildNotificationFromPortalConsultation(consultation) {
  const patientLine = [consultation.patientName, consultation.patientSpecies, consultation.patientBreed, consultation.patientSex]
    .filter(Boolean)
    .join(' · ')
  const priority = consultation.urgency === 'Urgente' ? 'Alta' : consultation.urgency === 'Baja' ? 'Baja' : 'Media'

  return {
    date: consultation.date || todayISO(),
    createdAtISO: nowISO(),
    type: 'Consulta portal',
    priority,
    status: 'No leída',
    title: `Consulta del tutor: ${consultation.patientName || 'Paciente'}`,
    message: [
      consultation.clientName ? `Tutor: ${consultation.clientName}` : '',
      patientLine ? `Paciente: ${patientLine}` : '',
      consultation.reason ? `Motivo: ${consultation.reason}` : '',
      consultation.message ? `Mensaje: ${consultation.message}` : '',
    ].filter(Boolean).join('\n'),
    source: 'portalConsultations',
    sourceId: consultation.id || '',
    clientId: consultation.clientId || '',
    clientName: consultation.clientName || '',
    clientEmail: consultation.clientEmail || consultation.contactEmail || '',
    patientId: consultation.patientId || '',
    patientName: consultation.patientName || '',
    patientSpecies: consultation.patientSpecies || '',
    patientBreed: consultation.patientBreed || '',
    patientSex: consultation.patientSex || '',
    patientBirthDate: consultation.patientBirthDate || '',
    patientWeight: consultation.patientWeight || '',
    patientColor: consultation.patientColor || '',
    patientCastrationStatus: consultation.patientCastrationStatus || '',
    patientChip: consultation.patientChip || '',
    patientAllergies: consultation.patientAllergies || '',
    patientAlerts: consultation.patientAlerts || '',
  }
}

export async function createPortalConsultationWithNotification({ user, patient, form }) {
  const consultationPayload = buildPortalConsultationPayload({ user, patient, form })
  const consultationId = await repository.createDocument('portalConsultations', consultationPayload)
  const notificationPayload = buildNotificationFromPortalConsultation({ ...consultationPayload, id: consultationId })
  await repository.createDocument('notifications', notificationPayload)
  return consultationId
}

export function buildEmailDraftFromConsultation(consultation = {}, clinicSettings = {}) {
  const patient = formatPatientSummary({
    name: consultation.patientName,
    species: consultation.patientSpecies,
    breed: consultation.patientBreed,
    sex: consultation.patientSex,
    weight: consultation.patientWeight,
    castrationStatus: consultation.patientCastrationStatus,
  })
  const subject = `Respuesta de ${clinicSettings.clinicName || 'la veterinaria'} - ${consultation.patientName || 'consulta'}`
  const body = [
    `Hola ${consultation.clientName || ''},`,
    '',
    `Recibimos tu consulta por ${consultation.patientName || 'tu animal'}.`,
    patient ? `Datos del paciente: ${patient}.` : '',
    consultation.reason ? `Motivo informado: ${consultation.reason}.` : '',
    '',
    'Te respondemos:',
    '',
    '',
    clinicSettings.clinicName ? `Saludos,\n${clinicSettings.clinicName}` : 'Saludos.',
  ].filter((line) => line !== '').join('\n')
  return { subject, body }
}

export function mailtoHref({ to, subject, body }) {
  const query = new URLSearchParams()
  if (subject) query.set('subject', subject)
  if (body) query.set('body', body)
  return `mailto:${encodeURIComponent(to || '')}?${query.toString()}`
}
