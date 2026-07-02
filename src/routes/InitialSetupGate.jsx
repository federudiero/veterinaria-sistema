import React, { useEffect, useMemo, useState } from 'react'
import { FormGrid } from '../components/forms/FormGrid.jsx'
import { useCollection } from '../hooks/useCollection.js'
import { useFeedback } from '../contexts/FeedbackContext.jsx'
import { isFirebaseMode } from '../services/repositories/repositoryFactory.js'

const REQUIRED_FIELDS = ['clinicName', 'cuit', 'address', 'phone', 'email']

function isGenericOrEmpty(value) {
  const text = String(value || '').trim()
  return !text || /veterinaria\s+gen[eé]rica/i.test(text) || /sistema\s+veterinaria/i.test(text)
}

function setupIsComplete(settings) {
  if (!settings) return false
  if (settings.setupCompleted === true) return true
  return REQUIRED_FIELDS.every((field) => !isGenericOrEmpty(settings[field]))
}

export function InitialSetupGate({ children }) {
  const settingsCollection = useCollection('settings', { limitCount: 20 })
  const feedback = useFeedback()
  const currentSettings = useMemo(
    () => settingsCollection.items.find((item) => item.id === 'app') || null,
    [settingsCollection.items],
  )
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    clinicName: currentSettings?.clinicName || '',
    legalName: currentSettings?.legalName || '',
    cuit: currentSettings?.cuit || '',
    taxCondition: currentSettings?.taxCondition || '',
    address: currentSettings?.address || '',
    phone: currentSettings?.phone || '',
    whatsapp: currentSettings?.whatsapp || '',
    emergencyPhone: currentSettings?.emergencyPhone || '',
    email: currentSettings?.email || '',
    website: currentSettings?.website || '',
    instagram: currentSettings?.instagram || '',
    logoUrl: currentSettings?.logoUrl || '',
    logoText: currentSettings?.logoText || 'SV',
    primaryColor: currentSettings?.primaryColor || '#0f766e',
    professionalLicense: currentSettings?.professionalLicense || '',
    footerNote: currentSettings?.footerNote || 'Documento emitido por Sistema Veterinaria.',
    currency: currentSettings?.currency || 'ARS',
    timezone: currentSettings?.timezone || 'America/Argentina/Cordoba',
    businessHours: currentSettings?.businessHours || 'Lunes a viernes 9 a 18 h · Sábados 9 a 13 h',
    appointmentInterval: currentSettings?.appointmentInterval || 30,
    defaultAppointmentDuration: currentSettings?.defaultAppointmentDuration || currentSettings?.appointmentInterval || 30,
    defaultReminderChannel: currentSettings?.defaultReminderChannel || 'WhatsApp',
    defaultReminderText: currentSettings?.defaultReminderText || 'Hola, te recordamos el turno de tu mascota en la veterinaria.',
    defaultPaymentMethod: currentSettings?.defaultPaymentMethod || 'Efectivo',
    defaultConsultationPrice: currentSettings?.defaultConsultationPrice || 0,
    defaultLowStockWarning: currentSettings?.defaultLowStockWarning || 5,
  })

  useEffect(() => {
    if (!currentSettings || setupIsComplete(currentSettings)) return
    setForm({
      clinicName: currentSettings.clinicName || '',
      legalName: currentSettings.legalName || '',
      cuit: currentSettings.cuit || '',
      taxCondition: currentSettings.taxCondition || '',
      address: currentSettings.address || '',
      phone: currentSettings.phone || '',
      whatsapp: currentSettings.whatsapp || '',
      emergencyPhone: currentSettings.emergencyPhone || '',
      email: currentSettings.email || '',
      website: currentSettings.website || '',
      instagram: currentSettings.instagram || '',
      logoUrl: currentSettings.logoUrl || '',
      logoText: currentSettings.logoText || 'SV',
      primaryColor: currentSettings.primaryColor || '#0f766e',
      professionalLicense: currentSettings.professionalLicense || '',
      footerNote: currentSettings.footerNote || 'Documento emitido por Sistema Veterinaria.',
      currency: currentSettings.currency || 'ARS',
      timezone: currentSettings.timezone || 'America/Argentina/Cordoba',
      businessHours: currentSettings.businessHours || 'Lunes a viernes 9 a 18 h · Sábados 9 a 13 h',
      appointmentInterval: currentSettings.appointmentInterval || 30,
      defaultAppointmentDuration: currentSettings.defaultAppointmentDuration || currentSettings.appointmentInterval || 30,
      defaultReminderChannel: currentSettings.defaultReminderChannel || 'WhatsApp',
      defaultReminderText: currentSettings.defaultReminderText || 'Hola, te recordamos el turno de tu mascota en la veterinaria.',
      defaultPaymentMethod: currentSettings.defaultPaymentMethod || 'Efectivo',
      defaultConsultationPrice: currentSettings.defaultConsultationPrice || 0,
      defaultLowStockWarning: currentSettings.defaultLowStockWarning || 5,
    })
  }, [currentSettings])

  if (!isFirebaseMode) return children
  if (settingsCollection.loading) return <div className="screen-loader">Verificando configuración inicial...</div>
  if (settingsCollection.error) {
    return (
      <main className="system-screen">
        <section className="system-card system-card-danger">
          <div className="system-icon">!</div>
          <p className="eyebrow">Configuración inicial</p>
          <h1>No se pudo leer la configuración del tenant</h1>
          <p>{settingsCollection.error}</p>
          <p className="muted">Revisá reglas, tenant activo y perfil del usuario en Firestore.</p>
        </section>
      </main>
    )
  }
  if (setupIsComplete(currentSettings)) return children

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    const missing = REQUIRED_FIELDS.filter((field) => !String(form[field] || '').trim())
    if (missing.length) {
      feedback.warning('Completá nombre, CUIT, dirección, teléfono y email antes de continuar.')
      return
    }

    setSaving(true)
    try {
      await settingsCollection.set('app', {
        ...form,
        appointmentInterval: Number(form.appointmentInterval || 30),
        defaultAppointmentDuration: Number(form.defaultAppointmentDuration || form.appointmentInterval || 30),
        defaultConsultationPrice: Number(form.defaultConsultationPrice || 0),
        defaultLowStockWarning: Number(form.defaultLowStockWarning || 0),
        setupCompleted: true,
        setupCompletedAt: new Date().toISOString(),
      })
      feedback.success('Configuración inicial guardada. El sistema ya está listo para operar.')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la configuración inicial.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="system-screen setup-screen">
      <section className="system-card setup-card">
        <div className="brand setup-brand">
          <div className="brand-mark">V+</div>
          <div>
            <strong>Sistema Veterinaria</strong>
            <small>Configuración inicial obligatoria</small>
          </div>
        </div>
        <p className="eyebrow">Primer arranque</p>
        <h1>Datos de la veterinaria</h1>
        <p>
          Estos datos se usan en PDF, Excel, recibos, recetas, historia clínica y reportes. En producción no se permite continuar con datos genéricos.
        </p>

        <form onSubmit={save} className="setup-form">
          <FormGrid
            value={form}
            onChange={change}
            fields={[
              { name: 'clinicName', label: 'Nombre comercial', required: true },
              { name: 'legalName', label: 'Razón social / nombre legal' },
              { name: 'cuit', label: 'CUIT / Identificación fiscal', required: true },
              { name: 'taxCondition', label: 'Condición fiscal' },
              { name: 'address', label: 'Dirección', required: true },
              { name: 'phone', label: 'Teléfono', required: true },
              { name: 'whatsapp', label: 'WhatsApp' },
              { name: 'emergencyPhone', label: 'Teléfono de urgencias' },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'website', label: 'Sitio web' },
              { name: 'instagram', label: 'Instagram / red social' },
              { name: 'logoUrl', label: 'URL del logo', hint: 'Podés usar una URL pública HTTPS. Sin Storage para evitar Blaze.' },
              { name: 'logoText', label: 'Iniciales del logo' },
              { name: 'primaryColor', label: 'Color principal HEX' },
              { name: 'professionalLicense', label: 'Matrícula / responsable técnico' },
              { name: 'footerNote', label: 'Leyenda al pie de documentos', type: 'textarea' },
              { name: 'currency', label: 'Moneda', type: 'select', options: ['ARS', 'USD'] },
              { name: 'timezone', label: 'Zona horaria' },
              { name: 'businessHours', label: 'Horario de atención' },
              { name: 'appointmentInterval', label: 'Intervalo turnos min', type: 'number' },
              { name: 'defaultAppointmentDuration', label: 'Duración sugerida del turno', type: 'number' },
              { name: 'defaultReminderChannel', label: 'Canal de recordatorio', type: 'select', options: ['WhatsApp', 'Email', 'Teléfono', 'Mostrador'] },
              { name: 'defaultPaymentMethod', label: 'Medio de pago habitual', type: 'select', options: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cuenta corriente'] },
              { name: 'defaultConsultationPrice', label: 'Precio base de consulta', type: 'number' },
              { name: 'defaultLowStockWarning', label: 'Alerta general de stock bajo', type: 'number' },
            ]}
          />
          <div className="system-actions setup-actions">
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar y continuar'}</button>
          </div>
        </form>
      </section>
    </main>
  )
}
