import React, { useMemo, useState } from 'react'

const PREFERRED_PRIMARY_LABELS = [
  'paciente', 'cliente', 'proveedor', 'producto', 'servicio', 'turno', 'profesional', 'veterinario',
  'concepto', 'documento', 'aplicación', 'aplicacion', 'vacuna', 'receta', 'nombre', 'titulo', 'título',
]
const DEPRIORITIZED_LABELS = [
  'id', 'sku', 'cuit', 'dni', 'fecha', 'estado', 'saldo', 'precio', 'importe', 'stock', 'mínimo', 'minimo',
  'neto', 'ingresos', 'egresos', 'movimientos', 'cierre', 'metodo', 'método', 'tipo', 'lote',
]
const LONG_DETAIL_LABELS = [
  'observaciones', 'notas', 'detalle', 'detalles', 'diagnóstico', 'diagnostico', 'tratamiento', 'medicación',
  'medicacion', 'alertas', 'indicaciones', 'motivo', 'anamnesis', 'evolución', 'evolucion',
]

function labelScore(column) {
  const label = String(column?.label || '').trim().toLowerCase()
  if (!label) return 0
  if (PREFERRED_PRIMARY_LABELS.some((item) => label.includes(item))) return 4
  if (DEPRIORITIZED_LABELS.some((item) => label === item || label.startsWith(`${item} `) || label.includes(` ${item}`))) return -2
  return 1
}

function isLongDetailColumn(column) {
  const label = String(column?.label || '').trim().toLowerCase()
  return LONG_DETAIL_LABELS.some((item) => label.includes(item))
}

function getColumnValue(row, column) {
  return column.render ? column.render(row) : (row[column.key] ?? '-')
}

function formatMetaValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number') return value
  return value
}

function resolveColumn(columns, reference) {
  if (!reference) return null
  if (typeof reference === 'object' && reference.key) return reference
  return columns.find((column) => column.key === reference || column.label === reference) || null
}

function resolveColumns(columns, references = []) {
  return references
    .map((reference) => resolveColumn(columns, reference))
    .filter(Boolean)
}

function uniqueColumns(columns) {
  const seen = new Set()
  return columns.filter((column) => {
    if (!column?.key || seen.has(column.key)) return false
    seen.add(column.key)
    return true
  })
}

function buildMobileLayout(columns, mobile = {}) {
  if (!Array.isArray(columns) || columns.length === 0) {
    return { primaryColumn: null, secondaryColumn: null, metaColumns: [], detailColumns: [] }
  }

  const sorted = [...columns].sort((a, b) => labelScore(b) - labelScore(a))
  const primaryColumn = resolveColumn(columns, mobile.title || mobile.primary || mobile.primaryKey) || sorted[0] || columns[0]
  const secondaryColumn = resolveColumn(columns, mobile.subtitle || mobile.secondary || mobile.secondaryKey)
    || sorted.find((column) => column.key !== primaryColumn.key)
    || null
  const summaryKeys = new Set([primaryColumn?.key, secondaryColumn?.key].filter(Boolean))
  const configuredMetaColumns = resolveColumns(columns, mobile.meta || mobile.metaKeys || [])
  const metaColumns = uniqueColumns(
    configuredMetaColumns.length
      ? configuredMetaColumns.filter((column) => !summaryKeys.has(column.key))
      : columns.filter((column) => !summaryKeys.has(column.key) && !isLongDetailColumn(column)).slice(0, 3),
  ).slice(0, mobile.maxMeta || 4)
  const detailColumns = resolveColumns(columns, mobile.details || mobile.detailKeys || [])

  return {
    primaryColumn,
    secondaryColumn,
    metaColumns,
    detailColumns: detailColumns.length ? uniqueColumns(detailColumns) : columns,
  }
}

export function DataTable({ columns, rows, empty = 'No hay registros.', actions, mobile, highlightedRowId = '' }) {
  const [expandedRows, setExpandedRows] = useState(() => new Set())
  const mobileLayout = useMemo(() => buildMobileLayout(columns, mobile), [columns, mobile])

  function toggleExpanded(rowId) {
    setExpandedRows((current) => {
      const next = new Set(current)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  return (
    <>
      <div className="table-wrap desktop-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              {actions && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="empty-cell">{empty}</td>
              </tr>
            ) : rows.map((row) => (
              <tr key={row.id} className={String(row.id) === String(highlightedRowId) ? 'is-highlighted-row' : ''}>
                {columns.map((column) => (
                  <td key={column.key} data-label={column.label}>
                    <span className="cell-content">{getColumnValue(row, column)}</span>
                  </td>
                ))}
                {actions && <td className="row-actions" data-label="Acciones">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-data-list" aria-label={mobile?.ariaLabel || 'Listado compacto'}>
        {rows.length === 0 ? (
          <div className="mobile-empty-state">{empty}</div>
        ) : rows.map((row) => {
          const expanded = expandedRows.has(row.id)
          const primaryValue = mobileLayout.primaryColumn ? getColumnValue(row, mobileLayout.primaryColumn) : row.id
          const secondaryValue = mobileLayout.secondaryColumn ? getColumnValue(row, mobileLayout.secondaryColumn) : null
          return (
            <article key={row.id} className={`mobile-data-card${expanded ? ' is-expanded' : ''}${String(row.id) === String(highlightedRowId) ? ' is-highlighted-row' : ''}`}>
              <div className="mobile-card-top">
                <div className="mobile-card-heading">
                  <strong>{primaryValue}</strong>
                  {mobileLayout.secondaryColumn && (
                    <span>
                      <b>{mobileLayout.secondaryColumn.label}:</b> {secondaryValue || '-'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-small btn-ghost mobile-detail-toggle"
                  onClick={() => toggleExpanded(row.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? 'Ocultar' : 'Ver detalle'}
                </button>
              </div>

              {mobileLayout.metaColumns.length > 0 && (
                <div className="mobile-card-meta">
                  {mobileLayout.metaColumns.map((column) => (
                    <div key={column.key} className="mobile-meta-pill">
                      <span>{column.label}</span>
                      <strong>{formatMetaValue(getColumnValue(row, column))}</strong>
                    </div>
                  ))}
                </div>
              )}

              {actions && <div className="mobile-card-actions">{actions(row)}</div>}

              {expanded && (
                <div className="mobile-card-details">
                  {mobileLayout.detailColumns.map((column) => (
                    <div key={column.key} className="mobile-detail-row">
                      <span>{column.label}</span>
                      <div>{getColumnValue(row, column)}</div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
