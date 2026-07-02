import React, { useState } from 'react'
import { downloadExcelReport, printProfessionalReport } from '../../utils/exporters.js'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'

function normalizeRowsResult(result, fallbackRows) {
  if (!result) return { rows: fallbackRows, truncated: false, maxRows: null }
  if (Array.isArray(result)) return { rows: result, truncated: false, maxRows: null }
  return {
    rows: Array.isArray(result.rows) ? result.rows : fallbackRows,
    truncated: Boolean(result.truncated),
    maxRows: result.maxRows || null,
  }
}

export function ExportButtons({ title, subtitle, rows = [], columns = [], summary = [], fileLabel, getRows }) {
  const clinic = useClinicSettings()
  const feedback = useFeedback()
  const [busy, setBusy] = useState(false)

  async function buildPayload() {
    const result = typeof getRows === 'function' ? await getRows() : null
    const resolved = normalizeRowsResult(result, rows)
    const exportSummary = [
      ...summary,
      { label: 'Registros exportados', value: resolved.rows.length },
      ...(resolved.truncated ? [{ label: 'Aviso', value: `Exportación limitada a ${resolved.maxRows || resolved.rows.length} registros para evitar lecturas masivas.` }] : []),
    ]

    return {
      title,
      subtitle,
      rows: resolved.rows,
      columns,
      clinic,
      summary: exportSummary,
      fileLabel,
      truncated: resolved.truncated,
    }
  }

  async function runExport(kind) {
    if (busy) return
    setBusy(true)
    try {
      const payload = await buildPayload()
      if (kind === 'pdf') {
        printProfessionalReport(payload)
        feedback.info(
          payload.truncated
            ? 'Se abrió la impresión con el máximo seguro de registros. Elegí “Guardar como PDF”.'
            : 'Se abrió la ventana de impresión. Elegí “Guardar como PDF” para descargarlo.',
          'PDF preparado',
        )
      } else {
        downloadExcelReport(payload)
        feedback.success(
          payload.truncated
            ? 'El Excel se descargó con el máximo seguro de registros filtrados.'
            : 'El archivo Excel se descargó con los filtros actuales.',
          'Excel generado',
        )
      }
    } catch (error) {
      feedback.error(error?.message || `No se pudo generar el ${kind === 'pdf' ? 'PDF' : 'Excel'}.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="export-actions" aria-label="Exportaciones">
      <button className="btn btn-small" type="button" disabled={busy} onClick={() => runExport('pdf')}>
        {busy ? 'Preparando...' : 'PDF'}
      </button>
      <button className="btn btn-small" type="button" disabled={busy} onClick={() => runExport('excel')}>
        {busy ? 'Preparando...' : 'Excel'}
      </button>
    </div>
  )
}
