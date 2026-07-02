import React, { useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { repository, isFirebaseMode } from '../../services/repositories/repositoryFactory.js'
import { TENANT_ID } from '../../services/firebase/config.js'
import { APP_VERSION } from '../../config/runtime.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'

const BACKUP_COLLECTIONS = [
  ['settings', 'Configuración'],
  ['users', 'Usuarios'],
  ['clients', 'Clientes'],
  ['patients', 'Pacientes'],
  ['clinicalRecords', 'Historia clínica'],
  ['vaccines', 'Vacunas'],
  ['prescriptions', 'Recetas'],
  ['appointments', 'Turnos'],
  ['reminders', 'Recordatorios'],
  ['waitingQueue', 'Cola de espera'],
  ['sales', 'Ventas'],
  ['currentAccounts', 'Cuentas corrientes'],
  ['cashMovements', 'Movimientos de caja'],
  ['cashClosures', 'Cierres de caja'],
  ['products', 'Productos'],
  ['stockMovements', 'Movimientos de stock'],
  ['suppliers', 'Proveedores'],
  ['purchases', 'Compras'],
  ['boarding', 'Internación'],
  ['memberships', 'Mutualismo'],
  ['auditLogs', 'Auditoría'],
]

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function safeFileDate() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

export function BackupPage() {
  const feedback = useFeedback()
  const { hasPermission, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const canBackup = hasPermission('backup.write') || hasPermission('configuracion.write')

  const totalExported = useMemo(() => results.reduce((sum, item) => sum + Number(item.count || 0), 0), [results])

  async function buildBackup() {
    if (!canBackup) {
      feedback.warning('No tenés permiso para generar respaldos.')
      return
    }

    setLoading(true)
    setResults([])
    try {
      const data = {}
      const nextResults = []

      for (const [collectionName, label] of BACKUP_COLLECTIONS) {
        const response = await repository.fetchCollectionForExport(collectionName, {
          orderByField: collectionName === 'settings' ? undefined : 'updatedAt',
          orderDirection: 'desc',
        })
        const rows = Array.isArray(response?.rows) ? response.rows : []
        data[collectionName] = rows
        nextResults.push({
          id: collectionName,
          collectionName,
          label,
          count: rows.length,
          note: response?.truncated ? `Exportó el máximo seguro de ${response.maxRows}. Hay más registros.` : 'Completo dentro del límite seguro.',
        })
      }

      const payload = {
        meta: {
          app: 'Sistema Veterinaria',
          version: APP_VERSION,
          tenantId: TENANT_ID,
          generatedAt: new Date().toISOString(),
          generatedBy: user?.email || '',
          mode: isFirebaseMode ? 'firebase' : 'local-demo',
          limitPerCollection: 'máximo seguro del navegador',
          warning: 'Backup operativo JSON. Para historiales masivos conviene programar backup server-side.',
        },
        data,
      }

      setResults(nextResults)
      downloadJson(payload, `backup-sistema-veterinaria-${TENANT_ID}-${safeFileDate()}.json`)
      feedback.success('Backup JSON generado. Revisá la carpeta de descargas.', 'Respaldo listo')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo generar el backup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Operación"
        title="Respaldo y continuidad"
        description="Exportación operativa en JSON para soporte, migraciones y resguardo manual. No reemplaza un backup server-side programado, pero deja el sistema comercialmente más mantenible."
        actions={canBackup && <button className="btn btn-primary" type="button" onClick={buildBackup} disabled={loading}>{loading ? 'Generando...' : 'Generar backup JSON'}</button>}
      />

      <div className="stats-grid compact">
        <StatCard label="Colecciones incluidas" value={BACKUP_COLLECTIONS.length} tone="info" />
        <StatCard label="Registros exportados" value={totalExported} tone="success" />
        <StatCard label="Tenant" value={TENANT_ID} />
      </div>

      <div className="two-column two-column-wide">
        <article className="panel">
          <h2>Alcance del backup</h2>
          <p className="muted">
            El backup descarga un archivo JSON con configuración, clientes, pacientes, historia clínica, caja, stock, ventas, compras, auditoría y demás módulos. Usa el máximo seguro de exportación por colección para no disparar lecturas masivas desde el navegador.
          </p>
          <div className="backup-warning">
            <strong>Uso comercial</strong>
            <span>Para clientes con muchísimo historial conviene agregar luego backups automáticos desde backend. Esta pantalla sirve para soporte inmediato y migración controlada.</span>
          </div>
        </article>

        <article className="panel">
          <h2>Estado</h2>
          <DataTable
            rows={results.length ? results : BACKUP_COLLECTIONS.map(([collectionName, label]) => ({ id: collectionName, collectionName, label, count: '-', note: 'Pendiente de exportar' }))}
            columns={[
              { key: 'label', label: 'Módulo' },
              { key: 'collectionName', label: 'Colección' },
              { key: 'count', label: 'Registros' },
              { key: 'note', label: 'Detalle' },
            ]}
          />
        </article>
      </div>
    </section>
  )
}
