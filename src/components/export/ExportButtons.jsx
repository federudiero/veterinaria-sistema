import React from 'react'
import { downloadExcelReport, printProfessionalReport } from '../../utils/exporters.js'
import { useClinicSettings } from '../../hooks/useClinicSettings.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'

export function ExportButtons({ title, subtitle, rows = [], columns = [], summary = [], fileLabel }) {
  const clinic = useClinicSettings()
  const feedback = useFeedback()

  const reportPayload = {
    title,
    subtitle,
    rows,
    columns,
    clinic,
    summary,
    fileLabel,
  }

  function handlePdf() {
    try {
      printProfessionalReport(reportPayload)
      feedback.info('Se abrió la ventana de impresión. Elegí “Guardar como PDF” para descargarlo.', 'PDF preparado')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo generar el PDF.')
    }
  }

  function handleExcel() {
    try {
      downloadExcelReport(reportPayload)
      feedback.success('El archivo Excel se descargó con los filtros actuales.', 'Excel generado')
    } catch (error) {
      feedback.error(error?.message || 'No se pudo descargar el Excel.')
    }
  }

  return (
    <div className="export-actions" aria-label="Exportaciones">
      <button className="btn btn-small" type="button" onClick={handlePdf}>
        PDF
      </button>
      <button className="btn btn-small" type="button" onClick={handleExcel}>
        Excel
      </button>
    </div>
  )
}
