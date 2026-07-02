import React, { useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { repository, isFirebaseMode } from '../../services/repositories/repositoryFactory.js'
import { APP_CHECK_ENABLED, TENANT_ID, USE_EMULATORS } from '../../services/firebase/config.js'
import { ALLOW_DEMO_SEED, APP_ENV, APP_VERSION } from '../../config/runtime.js'
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
    address: appSettings.address || '',
    phone: appSettings.phone || '',
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
    appointmentInterval: appSettings.appointmentInterval || 30,
    navOrder: normalizeNavOrder(appSettings.navOrder),
  }

  const technicalRows = [
    { id: 'mode', key: 'Modo de datos', value: isFirebaseMode ? 'Firebase / Firestore' : 'LocalStorage demo' },
    { id: 'tenant', key: 'Tenant activo', value: TENANT_ID },
    { id: 'env', key: 'Ambiente', value: APP_ENV },
    { id: 'version', key: 'Versión', value: APP_VERSION },
    { id: 'emulators', key: 'Emuladores', value: USE_EMULATORS ? 'Activos' : 'Inactivos' },
    { id: 'appCheck', key: 'App Check', value: APP_CHECK_ENABLED ? 'Activo' : 'No configurado' },
    { id: 'storage', key: 'Storage', value: 'Desactivado para evitar Blaze' },
    { id: 'auth', key: 'Auth recomendado', value: 'Email/Password' },
    { id: 'exports', key: 'Exportaciones', value: 'PDF por impresión del navegador + Excel .xls sin dependencias externas' },
  ]

  const technicalColumns = [
    { key: 'key', label: 'Clave' },
    { key: 'value', label: 'Valor' },
  ]

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
    event.preventDefault()
    if (!canWrite) {
      feedback.warning('No tenés permiso para editar la configuración.')
      return
    }
    setSaving(true)
    try {
      await settings.set('app', { ...currentForm, appointmentInterval: Number(currentForm.appointmentInterval || 30), navOrder: normalizeNavOrder(currentForm.navOrder) })
      feedback.success('La configuración se guardó correctamente.')
      setForm(null)
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  async function seed() {
    if (!canWrite) {
      feedback.warning('No tenés permiso para cargar datos demo.')
      return
    }
    if (!ALLOW_DEMO_SEED) {
      feedback.warning('Los datos demo están deshabilitados en este ambiente.')
      return
    }
    const ok = await feedback.confirm({
      title: 'Cargar datos demo',
      message: 'En modo local reinicia los datos. En Firebase solo carga colecciones vacías.',
      confirmText: 'Cargar datos',
      tone: 'warning',
    })
    if (!ok) return
    try {
      await repository.seedDemoData({ overwrite: !isFirebaseMode })
      feedback.success('Los datos demo se cargaron correctamente.')
    } catch (error) {
      feedback.error(error?.message || 'No se pudieron cargar los datos demo.')
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Sistema"
        title="Configuración"
        description="Datos de la veterinaria, tenant activo y utilidades de arranque. Estos datos aparecen en los PDF y Excel profesionales."
        actions={
          <>
            <ExportButtons
              title="Configuración del sistema"
              subtitle="Datos técnicos y comerciales usados por Sistema Veterinaria."
              rows={technicalRows}
              columns={technicalColumns}
              summary={[{ label: 'Tenant', value: TENANT_ID }, { label: 'Modo', value: isFirebaseMode ? 'Firebase' : 'LocalStorage' }]}
              fileLabel="configuracion-sistema"
            />
            {ALLOW_DEMO_SEED && canWrite && <button className="btn" onClick={seed}>Cargar datos demo</button>}
          </>
        }
      />

      <div className="two-column">
        <article className="panel">
          <h2>Datos generales</h2>
          <form onSubmit={save}>
            <FormGrid
              value={currentForm}
              onChange={change}
              fields={[
                { name: 'clinicName', label: 'Nombre de la veterinaria' },
                { name: 'cuit', label: 'CUIT' },
                { name: 'address', label: 'Dirección' },
                { name: 'phone', label: 'Teléfono' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'currency', label: 'Moneda', type: 'select', options: ['ARS', 'USD'] },
                { name: 'timezone', label: 'Zona horaria' },
                { name: 'appointmentInterval', label: 'Intervalo turnos min', type: 'number' },
              ].map((field) => ({ ...field, disabled: !canWrite }))}
            />
            {canWrite && (
              <div className="form-actions">
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar configuración'}</button>
              </div>
            )}
          </form>

          <div className="brand-preview-card">
            <div
              className="brand-preview-logo"
              style={{ background: /^#[0-9a-f]{6}$/i.test(currentForm.primaryColor || '') ? currentForm.primaryColor : '#0f766e' }}
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
          <div className="panel-title-row">
            <div>
              <h2>Orden del navbar</h2>
              <p className="muted">Definí qué sección aparece primero y cuál queda al final. Aplica al menú de computadora y al menú horizontal de celular. Venta rápida se mantiene como botón separado junto a Salir.</p>
            </div>
            {canWrite && <button className="btn btn-small" type="button" onClick={resetNavOrder}>Restaurar</button>}
          </div>

          <div className="nav-order-list">
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
          {canWrite && (
            <div className="form-actions">
              <button className="btn btn-primary" type="button" disabled={saving} onClick={save}>
                {saving ? 'Guardando...' : 'Guardar orden'}
              </button>
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Estado técnico</h2>
            <ExportButtons title="Estado técnico" rows={technicalRows} columns={technicalColumns} fileLabel="estado-tecnico" />
          </div>
          <DataTable rows={technicalRows} columns={technicalColumns} />
        </article>
      </div>
    </section>
  )
}
