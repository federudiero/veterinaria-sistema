import React, { useMemo } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { StatusBadge } from '../../components/ui/StatusBadge.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { isFirebaseMode } from '../../services/repositories/repositoryFactory.js'
import {
  APP_CHECK_ENABLED,
  APP_CHECK_SITE_KEY,
  TENANT_ID,
  USE_EMULATORS,
  USE_FIREBASE,
  hasFirebaseConfig,
  missingFirebaseConfigKeys,
} from '../../services/firebase/config.js'
import {
  ALLOW_DEMO_SEED,
  ALLOW_LOCAL_DEMO,
  APP_ENV,
  APP_VERSION,
  IS_PRODUCTION,
  REQUIRE_APP_CHECK,
  REQUIRE_FIREBASE,
  SUPPORT_EMAIL,
} from '../../config/runtime.js'

function asStatus(ok, warning = false) {
  if (ok) return { label: 'Correcto', tone: 'success' }
  if (warning) return { label: 'Revisar', tone: 'warning' }
  return { label: 'Crítico', tone: 'danger' }
}

export function SystemStatusPage() {
  const feedback = useFeedback()
  const host = typeof window !== 'undefined' ? window.location.host : ''

  const checks = useMemo(() => [
    {
      id: 'env',
      area: 'Ambiente',
      check: 'Modo de producción',
      value: APP_ENV,
      recommendation: 'En deploy comercial debe ser production.',
      ...asStatus(IS_PRODUCTION, true),
    },
    {
      id: 'firebase',
      area: 'Firebase',
      check: 'Firebase habilitado',
      value: USE_FIREBASE ? 'Sí' : 'No',
      recommendation: 'Debe estar en true para no usar localStorage accidentalmente.',
      ...asStatus(USE_FIREBASE),
    },
    {
      id: 'firebase-config',
      area: 'Firebase',
      check: 'Variables web app',
      value: hasFirebaseConfig ? 'Completas' : missingFirebaseConfigKeys.join(', '),
      recommendation: 'apiKey, authDomain, projectId y appId son obligatorias.',
      ...asStatus(hasFirebaseConfig),
    },
    {
      id: 'emulators',
      area: 'Firebase',
      check: 'Emuladores apagados',
      value: USE_EMULATORS ? 'Activos' : 'Inactivos',
      recommendation: 'En producción VITE_USE_FIREBASE_EMULATORS debe ser false.',
      ...asStatus(!USE_EMULATORS),
    },
    {
      id: 'local-demo',
      area: 'Datos',
      check: 'Modo demo bloqueado',
      value: ALLOW_LOCAL_DEMO ? 'Permitido' : 'Bloqueado',
      recommendation: 'En producción debe estar bloqueado.',
      ...asStatus(!ALLOW_LOCAL_DEMO, true),
    },
    {
      id: 'seed',
      area: 'Datos',
      check: 'Seed demo bloqueado',
      value: ALLOW_DEMO_SEED ? 'Permitido' : 'Bloqueado',
      recommendation: 'En producción no debe permitir cargar datos demo.',
      ...asStatus(!ALLOW_DEMO_SEED, true),
    },
    {
      id: 'app-check',
      area: 'Seguridad',
      check: 'App Check',
      value: APP_CHECK_ENABLED ? 'Activo' : REQUIRE_APP_CHECK ? 'Obligatorio sin site key' : 'No obligatorio',
      recommendation: 'Antes de vender, configurar reCAPTCHA v3 y activar VITE_REQUIRE_APPCHECK=true.',
      ...asStatus(APP_CHECK_ENABLED, !REQUIRE_APP_CHECK),
    },
    {
      id: 'tenant',
      area: 'Multi-tenant',
      check: 'Tenant configurado',
      value: TENANT_ID,
      recommendation: 'Usar un tenant estable por veterinaria. Evitar cambiarlo después de cargar datos.',
      ...asStatus(Boolean(TENANT_ID), true),
    },
    {
      id: 'support',
      area: 'Soporte',
      check: 'Email de soporte',
      value: SUPPORT_EMAIL || 'No configurado',
      recommendation: 'Configurar VITE_SUPPORT_EMAIL para errores y soporte comercial.',
      ...asStatus(Boolean(SUPPORT_EMAIL), true),
    },
  ], [])

  const columns = [
    { key: 'area', label: 'Área' },
    { key: 'check', label: 'Control' },
    { key: 'value', label: 'Valor' },
    { key: 'label', label: 'Estado', render: (row) => <StatusBadge tone={row.tone}>{row.label}</StatusBadge> },
    { key: 'recommendation', label: 'Recomendación' },
  ]

  const critical = checks.filter((item) => item.tone === 'danger').length
  const warnings = checks.filter((item) => item.tone === 'warning').length
  const ok = checks.filter((item) => item.tone === 'success').length

  const deployCommands = `npm run safe-install\nnpm run qa:release\nfirebase deploy --only firestore:rules,firestore:indexes\nnpm run deploy:hosting`

  async function copyDeployCommands() {
    try {
      await navigator.clipboard.writeText(deployCommands)
      feedback.success('Comandos de deploy copiados.')
    } catch {
      feedback.warning('No se pudieron copiar los comandos. Copialos manualmente desde la documentación.')
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Producción"
        title="Estado del sistema"
        description="Checklist operativo para dominio, deploy, Firebase, App Check y configuración comercial antes de entregar a un cliente."
        actions={
          <>
            <ExportButtons
              title="Estado del sistema"
              subtitle={`Host: ${host || 'Sin host'} · Tenant: ${TENANT_ID}`}
              rows={checks}
              columns={columns.filter((column) => column.key !== 'label')}
              summary={[
                { label: 'Correctos', value: ok },
                { label: 'Advertencias', value: warnings },
                { label: 'Críticos', value: critical },
              ]}
              fileLabel="estado-produccion"
            />
            <button className="btn btn-primary" onClick={copyDeployCommands}>Copiar deploy</button>
          </>
        }
      />

      <div className="stats-grid compact">
        <article className="stat-card tone-success"><span>Correctos</span><strong>{ok}</strong><small>Controles listos</small></article>
        <article className="stat-card tone-warning"><span>Advertencias</span><strong>{warnings}</strong><small>Revisar antes de vender</small></article>
        <article className="stat-card tone-danger"><span>Críticos</span><strong>{critical}</strong><small>Bloquean producción</small></article>
      </div>

      <div className="two-column-wide">
        <article className="panel">
          <div className="panel-title-row">
            <div>
              <h2>Checklist técnico</h2>
              <p className="muted">No reemplaza el QA manual, pero detecta las condiciones más importantes del runtime.</p>
            </div>
          </div>
          <DataTable rows={checks} columns={columns} />
        </article>

        <aside className="panel release-panel">
          <h2>Deploy recomendado</h2>
          <ol className="release-steps">
            <li><strong>Validar variables</strong><span>Ejecutar npm run check:deploy.</span></li>
            <li><strong>Compilar</strong><span>Ejecutar npm run build:production.</span></li>
            <li><strong>Subir reglas e índices</strong><span>firebase deploy --only firestore:rules,firestore:indexes.</span></li>
            <li><strong>Subir Hosting</strong><span>npm run deploy:hosting.</span></li>
            <li><strong>Probar login real</strong><span>Entrar con usuario admin y validar módulos críticos.</span></li>
          </ol>

          <div className="command-card">
            <code>{deployCommands}</code>
          </div>

          <div className="alert">
            <strong>App Check:</strong> {APP_CHECK_SITE_KEY ? 'site key cargada.' : 'pendiente de configurar. Recomendado antes de vender.'}
          </div>

          <div className="alert">
            <strong>Modo de datos:</strong> {isFirebaseMode ? 'Firebase / Firestore' : 'LocalStorage demo'}.
          </div>
        </aside>
      </div>
    </section>
  )
}
