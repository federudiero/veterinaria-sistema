const DEFAULT_SYSTEM_NAME = 'Sistema Veterinaria'

function todayLocalISO(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizeCell(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.map(normalizeCell).join(', ')
  if (typeof value === 'object') {
    if (value.props?.children) return normalizeCell(value.props.children)
    return JSON.stringify(value)
  }
  return String(value)
}

function getColumnValue(column, row) {
  if (column.exportValue) return normalizeCell(column.exportValue(row))
  if (column.render) return normalizeCell(column.render(row))
  return normalizeCell(row[column.key])
}

function isGenericClinicName(value) {
  return /veterinaria\s+gen[eé]rica/i.test(String(value || ''))
}

function safeClinicName(value) {
  if (!value || isGenericClinicName(value)) return DEFAULT_SYSTEM_NAME
  return String(value)
}

function safeColor(value) {
  const text = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(text) ? text : '#0f766e'
}

function brandInitials(value) {
  const parts = safeClinicName(value).split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] || 'S') + (parts[1]?.[0] || 'V')).toUpperCase()
}

function dedupeColumns(columns) {
  const seen = new Set()
  return columns.filter((column) => {
    const key = String(column.label || column.key || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return column.exportable !== false
  })
}

function asReportColumns(columns) {
  return dedupeColumns(columns)
    .map((column) => ({ key: column.key, label: column.label || column.key, value: column.exportValue || column.render }))
}

function buildRows(rows, columns) {
  return rows.map((row) => {
    const next = {}
    columns.forEach((column) => {
      next[column.label] = getColumnValue(column, row)
    })
    return next
  })
}

function slugify(value) {
  return String(value || 'reporte')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'reporte'
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function formatClinicLine(settings = {}) {
  return [settings.legalName, settings.address, settings.phone, settings.whatsapp ? `WhatsApp ${settings.whatsapp}` : '', settings.email, settings.cuit ? `CUIT ${settings.cuit}` : '', settings.taxCondition, settings.website, settings.instagram]
    .filter(Boolean)
    .join(' · ')
}

function summaryHtml(summary = []) {
  if (!summary.length) return ''
  return `
    <section class="summary-grid">
      ${summary.map((item) => `
        <article class="summary-card">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </article>
      `).join('')}
    </section>
  `
}

function rowsTableHtml(rows, columns) {
  if (!rows.length) {
    return '<p class="empty">No hay registros para imprimir con los filtros actuales.</p>'
  }

  return `
    <div class="table-box">
      <table>
        <colgroup>${columns.map(() => '<col />').join('')}</colgroup>
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              ${columns.map((column) => `<td>${escapeHtml(getColumnValue(column, row))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function recordTitle(row, columns, index) {
  const priorityLabels = ['Paciente', 'Cliente', 'Contacto / responsable', 'Producto', 'Proveedor', 'Fecha', 'Concepto', 'Usuario']
  for (const label of priorityLabels) {
    const column = columns.find((item) => item.label === label)
    if (!column) continue
    const value = getColumnValue(column, row)
    if (value && value !== '-') return value
  }
  const firstValue = getColumnValue(columns[0], row)
  return firstValue && firstValue !== '-' ? firstValue : `Registro ${index + 1}`
}

function rowsCardsHtml(rows, columns) {
  if (!rows.length) {
    return '<p class="empty">No hay registros para imprimir con los filtros actuales.</p>'
  }

  return `
    <section class="record-list">
      ${rows.map((row, rowIndex) => `
        <article class="record-card">
          <h3>${escapeHtml(recordTitle(row, columns, rowIndex))}</h3>
          <dl class="record-grid">
            ${columns.map((column) => `
              <div>
                <dt>${escapeHtml(column.label)}</dt>
                <dd>${escapeHtml(getColumnValue(column, row))}</dd>
              </div>
            `).join('')}
          </dl>
        </article>
      `).join('')}
    </section>
  `
}

export function printProfessionalReport({ title, subtitle, rows = [], columns = [], clinic = {}, summary = [], fileLabel = '' }) {
  const normalizedColumns = asReportColumns(columns)
  const generatedAt = new Date().toLocaleString('es-AR')
  const clinicName = safeClinicName(clinic.clinicName)
  const clinicLine = formatClinicLine(clinic)
  const primaryColor = safeColor(clinic.primaryColor)
  const logoUrl = String(clinic.logoUrl || '').trim()
  const logoText = String(clinic.logoText || brandInitials(clinicName)).slice(0, 4).toUpperCase()
  const reportId = `${slugify(title)}-${Date.now()}`
  const useCards = normalizedColumns.length > 8
  const bodyClass = useCards ? 'layout-cards' : 'layout-table'

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #0f172a; font-family: Inter, Arial, sans-serif; background: #fff; }
  .report { width: 100%; }
  .topbar { height: 7px; background: linear-gradient(90deg, ${primaryColor}, #14b8a6, #2563eb); border-radius: 999px; margin-bottom: 16px; }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; border-bottom: 1px solid #dbe3ea; padding-bottom: 14px; }
  .brand { display: flex; gap: 12px; align-items: center; min-width: 0; }
  .logo { flex: 0 0 auto; width: 48px; height: 48px; border-radius: 16px; object-fit: cover; background: linear-gradient(135deg, ${primaryColor}, #14b8a6); color: white; display: grid; place-items: center; font-weight: 900; font-size: 20px; }
  h1 { margin: 0; font-size: 23px; letter-spacing: -0.03em; }
  .clinic-name { margin: 0 0 3px; font-size: 16px; font-weight: 900; }
  .clinic-line, .meta, .subtitle, footer { color: #64748b; font-size: 11px; line-height: 1.45; }
  .clinic-line { overflow-wrap: anywhere; }
  .meta { text-align: right; min-width: 165px; }
  .hero { margin: 18px 0 14px; }
  .subtitle { margin: 4px 0 0; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 14px 0; }
  .summary-card { border: 1px solid #dbe3ea; border-radius: 12px; padding: 8px 10px; background: #f8fafc; min-width: 0; }
  .summary-card span { display: block; color: #64748b; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
  .summary-card strong { display: block; margin-top: 3px; font-size: 13px; overflow-wrap: anywhere; }
  .table-box { width: 100%; overflow: visible; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 9px; table-layout: fixed; }
  th { text-align: left; background: ${primaryColor}; color: white; padding: 6px; font-weight: 800; border: 1px solid ${primaryColor}; overflow-wrap: anywhere; }
  td { padding: 6px; border: 1px solid #dbe3ea; vertical-align: top; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
  tr:nth-child(even) td { background: #f8fafc; }
  .empty { border: 1px dashed #cbd5e1; color: #64748b; padding: 18px; border-radius: 14px; }
  .record-list { display: grid; gap: 12px; margin-top: 12px; }
  .record-card { border: 1px solid #dbe3ea; border-radius: 16px; padding: 13px; page-break-inside: avoid; break-inside: avoid; background: #fff; }
  .record-card h3 { margin: 0 0 10px; color: ${primaryColor}; font-size: 15px; letter-spacing: -0.02em; }
  .record-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px 10px; margin: 0; }
  .record-grid div { padding: 7px 8px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; min-width: 0; }
  .record-grid dt { color: #64748b; font-size: 8.8px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 3px; }
  .record-grid dd { margin: 0; font-size: 11px; font-weight: 700; overflow-wrap: anywhere; white-space: pre-wrap; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #dbe3ea; display: flex; justify-content: space-between; gap: 18px; }
  .signature { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .signature div { border-top: 1px solid #94a3b8; padding-top: 7px; text-align: center; color: #64748b; font-size: 10px; }
  @media print {
    .no-print { display: none !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .record-card { page-break-inside: avoid; break-inside: avoid; }
  }
</style>
</head>
<body class="${bodyClass}">
  <main class="report">
    <div class="topbar"></div>
    <header>
      <div class="brand">
        ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="Logo" />` : `<div class="logo">${escapeHtml(logoText)}</div>`}
        <div>
          <p class="clinic-name">${escapeHtml(clinicName)}</p>
          <p class="clinic-line">${escapeHtml(clinicLine || 'Sistema veterinario profesional')}</p>
        </div>
      </div>
      <div class="meta">
        <strong>Reporte generado</strong><br />
        ${escapeHtml(generatedAt)}<br />
        ${escapeHtml(fileLabel || reportId)}<br />
        Total registros: ${rows.length}
      </div>
    </header>

    <section class="hero">
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
    </section>

    ${summaryHtml(summary)}
    ${useCards ? rowsCardsHtml(rows, normalizedColumns) : rowsTableHtml(rows, normalizedColumns)}

    <div class="signature">
      <div>Firma / responsable</div>
      <div>Aclaración</div>
    </div>

    <footer>
      <span>${escapeHtml(clinic.footerNote || `Documento emitido desde ${DEFAULT_SYSTEM_NAME}.`)}</span>
      <span>${escapeHtml(clinicName)}</span>
    </footer>
  </main>
  <script>
    window.onload = () => {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) {
    throw new Error('El navegador bloqueó la ventana de impresión. Permití popups para generar el PDF.')
  }
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  return true
}

export function downloadExcelReport({ title, subtitle, rows = [], columns = [], clinic = {}, summary = [], fileLabel = '' }) {
  const normalizedColumns = asReportColumns(columns)
  const generatedAt = new Date().toLocaleString('es-AR')
  const clinicName = safeClinicName(clinic.clinicName)
  const worksheetRows = buildRows(rows, normalizedColumns)
  const filename = `${slugify(fileLabel || title)}-${todayLocalISO()}.xls`
  const colspan = Math.max(normalizedColumns.length, 1)

  const headerRows = `
    <tr><td colspan="${colspan}" style="font-size:18px;font-weight:700;background:#0f766e;color:#fff;">${escapeHtml(clinicName)}</td></tr>
    <tr><td colspan="${colspan}" style="font-weight:700;">${escapeHtml(formatClinicLine(clinic) || 'Sistema veterinario profesional')}</td></tr>
    <tr><td colspan="${colspan}" style="font-size:16px;font-weight:700;">${escapeHtml(title)}</td></tr>
    ${subtitle ? `<tr><td colspan="${colspan}">${escapeHtml(subtitle)}</td></tr>` : ''}
    <tr><td colspan="${colspan}">Generado: ${escapeHtml(generatedAt)} · Registros: ${rows.length}</td></tr>
    <tr></tr>
    ${summary.map((item) => `<tr><td style="font-weight:700;background:#f8fafc;">${escapeHtml(item.label)}</td><td>${escapeHtml(item.value)}</td></tr>`).join('')}
    ${summary.length ? '<tr></tr>' : ''}
  `

  const tableRows = `
    <tr>${normalizedColumns.map((column) => `<th style="background:#0f766e;color:#fff;border:1px solid #dbe3ea;font-weight:700;">${escapeHtml(column.label)}</th>`).join('')}</tr>
    ${worksheetRows.map((row) => `
      <tr>${normalizedColumns.map((column) => `<td style="border:1px solid #dbe3ea;mso-number-format:'\\@';">${escapeHtml(row[column.label])}</td>`).join('')}</tr>
    `).join('')}
  `

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  table { border-collapse: collapse; font-family: Arial, sans-serif; }
  td, th { padding: 8px; vertical-align: top; white-space: pre-wrap; }
  th { min-width: 130px; }
</style>
</head>
<body>
  <table>
    <colgroup>${normalizedColumns.map(() => '<col style="width:170px" />').join('')}</colgroup>
    ${headerRows}
    ${tableRows}
  </table>
</body>
</html>`

  downloadBlob(`\ufeff${html}`, filename, 'application/vnd.ms-excel;charset=utf-8')
  return true
}
