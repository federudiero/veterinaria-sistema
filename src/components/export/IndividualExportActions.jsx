import React from 'react'
import { downloadExcelReport, printProfessionalReport } from '../../utils/exporters.js'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { repository } from '../../services/repositories/repositoryFactory.js'

function labelFor(row) {
  return row?.name || row?.displayName || row?.clientName || row?.patientName || row?.concept || row?.id || 'registro'
}

export function IndividualExportActions({
  row,
  columns = [],
  title = 'Detalle',
  subtitle = '',
  fileLabel = '',
  summary = [],
  pdfLabel = 'PDF',
  excelLabel = 'Excel',
}) {
  const clinic = useClinicSettings()
  const feedback = useFeedback()

  const payload = {
    title: `${title}: ${labelFor(row)}`,
    subtitle: subtitle || 'Ficha individual del registro seleccionado.',
    rows: row ? [row] : [],
    columns,
    clinic,
    summary,
    fileLabel: `${fileLabel || title}-${row?.id || Date.now()}`,
  }

  function audit(kind) {
    if (!row?.id) return
    repository.createDocument('auditLogs', {
      module: 'exports',
      action: `export.${kind}.individual`,
      entityId: row.id,
      summary: `Exportacion individual ${kind}: ${title} ${labelFor(row)}`,
      severity: 'info',
      createdAtISO: new Date().toISOString(),
    }).catch(() => null)
  }

  function printOne() {
    try {
      printProfessionalReport(payload)
      audit('pdf')
      feedback.info('Se abrio la impresion del registro individual.', 'PDF preparado')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo generar el PDF individual.')
    }
  }

  function exportOne() {
    try {
      downloadExcelReport(payload)
      audit('excel')
      feedback.success('Se descargo el Excel del registro individual.', 'Excel generado')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo generar el Excel individual.')
    }
  }

  return (
    <>
      <button className="btn btn-small" type="button" onClick={printOne}>{pdfLabel}</button>
      <button className="btn btn-small" type="button" onClick={exportOne}>{excelLabel}</button>
    </>
  )
}
