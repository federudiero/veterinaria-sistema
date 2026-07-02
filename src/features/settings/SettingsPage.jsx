import React, { useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { navigation } from '../../data/navigation.js'

const QUICK_SALE_PATH = '/venta-rapida'
const NAVBAR_ITEMS = navigation.filter((item) => item.path !== QUICK_SALE_PATH)
const DEFAULT_NAV_ORDER = NAVBAR_ITEMS.map((item) => item.path)

function normalizeNavOrder(value) {
  const saved = Array.isArray(value) ? value : []
  return [
    ...saved.filter((path) => DEFAULT_NAV_ORDER.includes(path)),
    ...DEFAULT_NAV_ORDER.filter((path) => !saved.includes(path)),
  ]
}

function labelForPath(path) {
  const item = navigation.find((entry) => entry.path === path)
  return item ? `${item.icon} ${item.label}` : path
}

function sanitizeColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : '#0f766e'
}

export function SettingsPage() {
  const settings = useCollection('settings')
  const [saving, setSaving] = useState(false)
  const appSettings = settings.items.find((item) => item.id === 'app') || {}
  const [form, setForm] = useState(null)
  const feedback = useFeedback()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('configuracion.write')

  const currentForm = form || {
    clinicName: /veterinaria\s+gen[eé]rica/i.test(String(appSettings.clinicName || '')) ? 'Sistema Veterinaria' : (appSettings.clinicName || 'Sistema Veterinaria'),
    legalName: appSettings.legalName || '',
    cuit: appSettings.cuit || '',
    taxCondition: appSettings.taxCondition || '',
    address: appSettings.address || '',
    phone: appSettings.phone || '',
    whatsapp: appSettings.whatsapp || '',
    emergencyPhone: appSettings.emergencyPhone || '',
    email: appSettings.email || '',
    website: appSettings.website || '',
    instagram: appSettings.instagram || '',
    logoUrl: appSettings.logoUrl || '',
    logoText: appSettings.logoText || 'SV',
    primaryColor: appSettings.primaryColor || '#0f766e',
    professionalLicense: appSettings.professionalLicense || '',
    footerNote: appSettings.footerNote || 'Documento emitido por Sistema Veterinaria.',
    currency: appSettings.currency || 'ARS',
    timezone: appSettings.timezone || 'America/Argentina/Cordoba',
    businessHours: appSettings.businessHours || 'Lunes a viernes 9 a 18 h · Sábados 9 a 13 h',
    appointmentInterval: appSettings.appointmentInterval || 30,
    defaultAppointmentDuration: appSettings.defaultAppointmentDuration || appSettings.appointmentInterval || 30,
    defaultReminderChannel: appSettings.defaultReminderChannel || 'WhatsApp',
    defaultReminderText: appSettings.defaultReminderText || 'Hola, te recordamos el turno de tu mascota en la veterinaria.',
    defaultPaymentMethod: appSettings.defaultPaymentMethod || 'Efectivo',
    defaultConsultationPrice: appSettings.defaultConsultationPrice || 0,
    defaultLowStockWarning: appSettings.defaultLowStockWarning || 5,
    navOrder: normalizeNavOrder(appSettings.navOrder),
  }


  function change(name, value) {
    setForm((current) => ({ ...(current || currentForm), [name]: value }))
  }

  function updateNavOrder(nextOrder) {
    setForm((current) => ({ ...(current || currentForm), navOrder: normalizeNavOrder(nextOrder) }))
  }


  function moveNavItem(path, direction) {
    if (!canWrite) return
    const order = normalizeNavOrder(currentForm.navOrder)
    const index = order.indexOf(path)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return
    const next = [...order]
    const [item] = next.splice(index, 1)
    next.splice(nextIndex, 0, item)
    updateNavOrder(next)
  }

  function resetNavOrder() {
    updateNavOrder(DEFAULT_NAV_ORDER)
  }

  async function save(event) {
    event?.preventDefault?.()
    if (!canWrite) {
      feedback.warning('No tenés permiso para editar la configuración.')
      return
    }
    setSaving(true)
    try {
      await settings.set('app', {
        ...currentForm,
        primaryColor: sanitizeColor(currentForm.primaryColor),
        appointmentInterval: Number(currentForm.appointmentInterval || 30),
        defaultAppointmentDuration: Number(currentForm.defaultAppointmentDuration || currentForm.appointmentInterval || 30),
        defaultConsultationPrice: Number(currentForm.defaultConsultationPrice || 0),
        defaultLowStockWarning: Number(currentForm.defaultLowStockWarning || 0),
        navOrder: normalizeNavOrder(currentForm.navOrder),
      })
      feedback.success('La configuración se guardó correctamente.')
      setForm(null)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Administración"
        title="Configuración de la veterinaria"
        description="Datos comerciales, documentos, agenda y parámetros operativos. El cliente puede ajustar estas opciones sin tocar código ni afectar módulos críticos."
        actions={canWrite && <button className="btn btn-primary" type="button" disabled={saving} onClick={save}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>}
      />

      <form onSubmit={save} className="two-column settings-form-grid">
        <article className="panel">
          <h2>Datos del negocio</h2>
          <p className="muted">Información visible en documentos, recibos, reportes y comunicaciones.</p>
          <FormGrid
            value={currentForm}
            onChange={change}
            fields={[
              { name: 'clinicName', label: 'Nombre comercial' },
              { name: 'legalName', label: 'Razón social / nombre legal' },
              { name: 'cuit', label: 'CUIT / identificación fiscal' },
              { name: 'taxCondition', label: 'Condición fiscal' },
              { name: 'address', label: 'Dirección' },
              { name: 'phone', label: 'Teléfono principal' },
              { name: 'whatsapp', label: 'WhatsApp' },
              { name: 'emergencyPhone', label: 'Teléfono de urgencias' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'website', label: 'Sitio web' },
              { name: 'instagram', label: 'Instagram / red social' },
            ].map((field) => ({ ...field, disabled: !canWrite }))}
          />
        </article>

        <article className="panel">
          <h2>Documentos e identidad</h2>
          <p className="muted">Branding usado en recetas, carnet sanitario, historias clínicas, recibos y exportaciones.</p>
          <FormGrid
            value={currentForm}
            onChange={change}
            fields={[
              { name: 'logoUrl', label: 'URL del logo', hint: 'Usá una URL pública HTTPS. No requiere Storage.' },
              { name: 'logoText', label: 'Iniciales si no hay logo' },
              { name: 'primaryColor', label: 'Color principal HEX', type: 'text', placeholder: '#0f766e' },
              { name: 'professionalLicense', label: 'Matrícula / responsable técnico' },
              { name: 'footerNote', label: 'Leyenda al pie de documentos', type: 'textarea', rows: 3 },
            ].map((field) => ({ ...field, disabled: !canWrite }))}
          />

          <div className="brand-preview-card">
            <div
              className="brand-preview-logo"
              style={{ background: sanitizeColor(currentForm.primaryColor) }}
            >
              {currentForm.logoUrl ? <img src={currentForm.logoUrl} alt="Logo" /> : (currentForm.logoText || 'SV').slice(0, 4).toUpperCase()}
            </div>
            <div>
              <strong>{currentForm.clinicName || 'Sistema Veterinaria'}</strong>
              <span>{[currentForm.legalName, currentForm.address, currentForm.phone, currentForm.email].filter(Boolean).join(' · ') || 'Vista previa de documentos profesionales'}</span>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Operación diaria</h2>
          <p className="muted">Parámetros simples que ayudan a estandarizar agenda, recordatorios, caja y alertas.</p>
          <FormGrid
            value={currentForm}
            onChange={change}
            fields={[
              { name: 'currency', label: 'Moneda', type: 'select', options: ['ARS', 'USD'] },
              { name: 'timezone', label: 'Zona horaria' },
              { name: 'businessHours', label: 'Horario de atención' },
              { name: 'appointmentInterval', label: 'Intervalo de agenda en minutos', type: 'number', min: 5, step: 5 },
              { name: 'defaultAppointmentDuration', label: 'Duración sugerida del turno', type: 'number', min: 5, step: 5 },
              { name: 'defaultReminderChannel', label: 'Canal de recordatorio', type: 'select', options: ['WhatsApp', 'Email', 'Teléfono', 'Mostrador'] },
              { name: 'defaultReminderText', label: 'Texto base de recordatorio', type: 'textarea', rows: 3 },
              { name: 'defaultPaymentMethod', label: 'Medio de pago habitual', type: 'select', options: ['Efectivo', 'Transferencia', 'Tarjeta', 'Cuenta corriente'] },
              { name: 'defaultConsultationPrice', label: 'Precio base de consulta', type: 'number', min: 0, step: 100 },
              { name: 'defaultLowStockWarning', label: 'Alerta general de stock bajo', type: 'number', min: 0, step: 1 },
            ].map((field) => ({ ...field, disabled: !canWrite }))}
          />
        </article>

        <article className="panel settings-wide-panel">
          <div className="panel-title-row">
            <div>
              <h2>Orden del menú</h2>
              <p className="muted">Definí qué sección aparece primero y cuál queda al final. No permite ocultar módulos críticos para evitar romper el flujo operativo.</p>
            </div>
            {canWrite && <button className="btn btn-small" type="button" onClick={resetNavOrder}>Restaurar</button>}
          </div>

          <div className="nav-order-list nav-order-list-compact">
            {normalizeNavOrder(currentForm.navOrder).map((path, index, order) => (
              <div className="nav-order-item" key={path}>
                <span className="nav-order-position">{index + 1}</span>
                <strong>{labelForPath(path)}</strong>
                <div className="nav-order-actions">
                  <button className="btn btn-small" type="button" disabled={!canWrite || index === 0} onClick={() => moveNavItem(path, -1)}>Subir</button>
                  <button className="btn btn-small" type="button" disabled={!canWrite || index === order.length - 1} onClick={() => moveNavItem(path, 1)}>Bajar</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        {canWrite && (
          <article className="panel settings-save-panel">
            <div>
              <h2>Guardar configuración</h2>
              <p className="muted">Los cambios se aplican al menú, documentos y parámetros operativos de la veterinaria.</p>
            </div>
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </article>
        )}
      </form>
    </section>
  )
}
