import { dateLabel, money } from './formatters.js'

const DEFAULT_SYSTEM_NAME = 'Sistema Veterinaria'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function cleanClinicName(value) {
  const text = String(value || '').trim()
  if (!text || /veterinaria\s+gen[eé]rica/i.test(text)) return DEFAULT_SYSTEM_NAME
  return text
}

function initials(value) {
  const text = cleanClinicName(value)
  const parts = text.split(/\s+/).filter(Boolean)
  return (parts[0]?.[0] || 'S') + (parts[1]?.[0] || 'V')
}

function safeColor(value) {
  const text = String(value || '').trim()
  return /^#[0-9a-f]{6}$/i.test(text) ? text : '#0f766e'
}

function valueOrDash(value) {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

function renderBrand(clinic = {}) {
  const clinicName = cleanClinicName(clinic.clinicName)
  const logoUrl = String(clinic.logoUrl || '').trim()
  const logoText = String(clinic.logoText || '').trim() || initials(clinicName)
  const legalName = String(clinic.legalName || '').trim()
  const lines = [
    legalName && legalName !== clinicName ? legalName : '',
    clinic.address,
    clinic.phone,
    clinic.email,
    clinic.cuit ? `CUIT ${clinic.cuit}` : '',
    clinic.website,
    clinic.instagram,
  ].filter(Boolean)

  return `
    <div class="brand-block">
      ${logoUrl ? `<img class="brand-logo-img" src="${escapeHtml(logoUrl)}" alt="Logo" />` : `<div class="brand-logo-text">${escapeHtml(logoText.slice(0, 4).toUpperCase())}</div>`}
      <div>
        <p class="clinic-name">${escapeHtml(clinicName)}</p>
        <p class="clinic-line">${escapeHtml(lines.join(' · ') || 'Sistema veterinario profesional')}</p>
      </div>
    </div>
  `
}

function renderGrid(items = []) {
  const visible = items.filter((item) => item && item.value !== undefined && item.value !== null && item.value !== '')
  if (!visible.length) return '<p class="empty">Sin datos cargados.</p>'
  return `
    <dl class="info-grid">
      ${visible.map((item) => `
        <div>
          <dt>${escapeHtml(item.label)}</dt>
          <dd>${escapeHtml(valueOrDash(item.value))}</dd>
        </div>
      `).join('')}
    </dl>
  `
}

function renderTable({ columns = [], rows = [] }) {
  if (!rows.length) return '<p class="empty">No hay registros asociados.</p>'
  return `
    <table>
      <thead>
        <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${columns.map((column) => `<td>${escapeHtml(valueOrDash(column.value ? column.value(row) : row[column.key]))}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `
}

function renderSections(sections = []) {
  return sections.map((section) => {
    const content = section.type === 'table'
      ? renderTable(section)
      : section.type === 'note'
        ? `<div class="note-box">${escapeHtml(section.text || '-')}</div>`
        : renderGrid(section.items)

    return `
      <section class="doc-section">
        <h2>${escapeHtml(section.title)}</h2>
        ${content}
      </section>
    `
  }).join('')
}

export function printDocument({ title, subtitle = '', clinic = {}, sections = [], footerNote = '', signatureLabels = ['Firma profesional', 'Aclaración / matrícula'] }) {
  const generatedAt = new Date().toLocaleString('es-AR')
  const primary = safeColor(clinic.primaryColor)
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 11mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #0f172a; font-family: Inter, Arial, sans-serif; background: #fff; }
  .document { width: 100%; }
  .topline { height: 7px; background: linear-gradient(90deg, ${primary}, #14b8a6, #2563eb); border-radius: 999px; margin-bottom: 16px; }
  header { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; padding-bottom: 14px; border-bottom: 1px solid #dbe3ea; }
  .brand-block { display: flex; align-items: center; gap: 13px; min-width: 0; }
  .brand-logo-text, .brand-logo-img { width: 54px; height: 54px; border-radius: 18px; flex: 0 0 auto; }
  .brand-logo-text { display: grid; place-items: center; background: ${primary}; color: white; font-weight: 950; letter-spacing: -.04em; }
  .brand-logo-img { object-fit: cover; border: 1px solid #e2e8f0; }
  .clinic-name { margin: 0 0 3px; font-size: 17px; font-weight: 950; letter-spacing: -.02em; }
  .clinic-line { margin: 0; color: #64748b; font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
  .meta { text-align: right; min-width: 170px; color: #64748b; font-size: 10.5px; line-height: 1.45; }
  .hero { margin: 18px 0 14px; }
  h1 { margin: 0; font-size: 25px; letter-spacing: -.05em; color: #0f172a; }
  .subtitle { margin: 5px 0 0; color: #64748b; line-height: 1.45; font-size: 11.5px; }
  .doc-section { margin-top: 14px; page-break-inside: avoid; break-inside: avoid; }
  .doc-section h2 { margin: 0 0 8px; font-size: 13px; letter-spacing: -.02em; color: ${primary}; }
  .info-grid { margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .info-grid div { border: 1px solid #e2e8f0; border-radius: 12px; padding: 8px 9px; background: #f8fafc; min-width: 0; }
  dt { color: #64748b; font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
  dd { margin: 0; font-size: 11px; font-weight: 750; white-space: pre-wrap; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 9.5px; }
  th { text-align: left; color: white; background: ${primary}; border: 1px solid ${primary}; padding: 6px; font-weight: 900; overflow-wrap: anywhere; }
  td { border: 1px solid #dbe3ea; padding: 6px; vertical-align: top; overflow-wrap: anywhere; white-space: pre-wrap; }
  tr:nth-child(even) td { background: #f8fafc; }
  .note-box, .empty { border: 1px dashed #cbd5e1; border-radius: 14px; padding: 12px; color: #475569; background: #f8fafc; white-space: pre-wrap; line-height: 1.5; }
  .signature { margin-top: 38px; display: grid; grid-template-columns: 1fr 1fr; gap: 42px; }
  .signature div { border-top: 1px solid #94a3b8; padding-top: 7px; text-align: center; color: #64748b; font-size: 10px; }
  footer { margin-top: 18px; padding-top: 10px; border-top: 1px solid #dbe3ea; display: flex; justify-content: space-between; gap: 16px; color: #64748b; font-size: 10px; line-height: 1.4; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .doc-section { page-break-inside: avoid; break-inside: avoid; } }
</style>
</head>
<body>
  <main class="document">
    <div class="topline"></div>
    <header>
      ${renderBrand(clinic)}
      <div class="meta">
        <strong>Documento emitido</strong><br />
        ${escapeHtml(generatedAt)}<br />
        Sistema Veterinaria<br />
        ${clinic.professionalLicense ? `Matrícula: ${escapeHtml(clinic.professionalLicense)}` : ''}
      </div>
    </header>
    <section class="hero">
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
    </section>
    ${renderSections(sections)}
    <div class="signature">
      ${signatureLabels.map((label) => `<div>${escapeHtml(label)}</div>`).join('')}
    </div>
    <footer>
      <span>${escapeHtml(footerNote || clinic.footerNote || 'Documento emitido por Sistema Veterinaria.')}</span>
      <span>${escapeHtml(cleanClinicName(clinic.clinicName))}</span>
    </footer>
  </main>
  <script>window.addEventListener('load', () => { window.focus(); setTimeout(() => window.print(), 250); });</script>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=980,height=760')
  if (!win) throw new Error('El navegador bloqueó la ventana de impresión. Permití popups para generar el PDF.')
  win.document.open()
  win.document.write(html)
  win.document.close()
}

export function printClinicalHistoryDocument({ clinic, client, patient, records = [], vaccines = [], prescriptions = [] }) {
  printDocument({
    title: `Historia clínica de ${patient?.name || 'paciente'}`,
    subtitle: 'Resumen clínico completo con datos del responsable, antecedentes, vacunas y recetas registradas.',
    clinic,
    sections: [
      {
        title: 'Contacto responsable',
        items: [
          { label: 'Nombre', value: client?.name },
          { label: 'DNI / CUIT', value: client?.dni || client?.cuit },
          { label: 'Teléfono', value: client?.phone },
          { label: 'Email', value: client?.email },
          { label: 'Dirección', value: client?.address },
          { label: 'Ciudad', value: client?.city },
        ],
      },
      {
        title: 'Paciente',
        items: [
          { label: 'Nombre', value: patient?.name },
          { label: 'Especie', value: patient?.species },
          { label: 'Raza', value: patient?.breed },
          { label: 'Sexo', value: patient?.sex },
          { label: 'Nacimiento', value: dateLabel(patient?.birthDate) },
          { label: 'Peso', value: patient?.weight ? `${patient.weight} kg` : '' },
          { label: 'Microchip', value: patient?.chip },
          { label: 'Alergias', value: patient?.allergies },
          { label: 'Alertas', value: patient?.alerts },
        ],
      },
      {
        title: 'Evoluciones clínicas',
        type: 'table',
        columns: [
          { key: 'date', label: 'Fecha', value: (row) => dateLabel(row.date) },
          { key: 'type', label: 'Tipo' },
          { key: 'professional', label: 'Profesional' },
          { key: 'reason', label: 'Motivo' },
          { key: 'diagnosis', label: 'Diagnóstico' },
          { key: 'treatment', label: 'Tratamiento' },
          { key: 'notes', label: 'Notas' },
        ],
        rows: records,
      },
      {
        title: 'Vacunas y antiparasitarios',
        type: 'table',
        columns: [
          { key: 'date', label: 'Fecha', value: (row) => dateLabel(row.date) },
          { key: 'vaccine', label: 'Aplicación' },
          { key: 'batch', label: 'Lote' },
          { key: 'nextDueDate', label: 'Próximo', value: (row) => dateLabel(row.nextDueDate) },
          { key: 'professional', label: 'Profesional' },
          { key: 'status', label: 'Estado' },
        ],
        rows: vaccines,
      },
      {
        title: 'Recetas e indicaciones',
        type: 'table',
        columns: [
          { key: 'date', label: 'Fecha', value: (row) => dateLabel(row.date) },
          { key: 'professional', label: 'Profesional' },
          { key: 'diagnosis', label: 'Diagnóstico' },
          { key: 'medication', label: 'Medicación' },
          { key: 'instructions', label: 'Indicaciones' },
          { key: 'status', label: 'Estado' },
        ],
        rows: prescriptions,
      },
    ],
  })
}

export function printVaccinationCard({ clinic, client, patient, vaccines = [] }) {
  printDocument({
    title: `Carnet sanitario de ${patient?.name || 'paciente'}`,
    subtitle: 'Registro de vacunas, antiparasitarios, lote y próximos refuerzos.',
    clinic,
    sections: [
      {
        title: 'Paciente y responsable',
        items: [
          { label: 'Paciente', value: patient?.name },
          { label: 'Especie', value: patient?.species },
          { label: 'Raza', value: patient?.breed },
          { label: 'Sexo', value: patient?.sex },
          { label: 'Responsable', value: client?.name },
          { label: 'Teléfono', value: client?.phone },
          { label: 'Email', value: client?.email },
          { label: 'Microchip', value: patient?.chip },
        ],
      },
      {
        title: 'Aplicaciones',
        type: 'table',
        columns: [
          { key: 'date', label: 'Aplicación', value: (row) => dateLabel(row.date) },
          { key: 'vaccine', label: 'Vacuna / antiparasitario' },
          { key: 'batch', label: 'Lote' },
          { key: 'nextDueDate', label: 'Próximo refuerzo', value: (row) => dateLabel(row.nextDueDate) },
          { key: 'professional', label: 'Profesional' },
          { key: 'notes', label: 'Notas' },
        ],
        rows: vaccines,
      },
    ],
  })
}

export function printPrescriptionDocument({ clinic, client, patient, prescription }) {
  printDocument({
    title: `Receta / indicación médica`,
    subtitle: `Paciente: ${patient?.name || '-'} · Responsable: ${client?.name || '-'}`,
    clinic,
    sections: [
      {
        title: 'Datos del paciente',
        items: [
          { label: 'Paciente', value: patient?.name },
          { label: 'Especie', value: patient?.species },
          { label: 'Raza', value: patient?.breed },
          { label: 'Peso', value: patient?.weight ? `${patient.weight} kg` : '' },
          { label: 'Responsable', value: client?.name },
          { label: 'Teléfono', value: client?.phone },
        ],
      },
      {
        title: 'Diagnóstico',
        type: 'note',
        text: prescription?.diagnosis || '-',
      },
      {
        title: 'Medicación indicada',
        type: 'note',
        text: prescription?.medication || '-',
      },
      {
        title: 'Indicaciones',
        type: 'note',
        text: prescription?.instructions || prescription?.notes || '-',
      },
      {
        title: 'Datos profesionales',
        items: [
          { label: 'Fecha', value: dateLabel(prescription?.date) },
          { label: 'Profesional', value: prescription?.professional },
          { label: 'Estado', value: prescription?.status },
        ],
      },
    ],
  })
}

export function printSaleReceipt({ clinic, client, patient, sale }) {
  printDocument({
    title: `Recibo de venta`,
    subtitle: sale?.receiptNumber ? `Comprobante ${sale.receiptNumber}` : 'Comprobante interno de operación',
    clinic,
    signatureLabels: ['Firma receptor', 'Aclaración'],
    sections: [
      {
        title: 'Cliente / paciente',
        items: [
          { label: 'Cliente', value: client?.name },
          { label: 'Teléfono', value: client?.phone },
          { label: 'Email', value: client?.email },
          { label: 'Paciente', value: patient?.name },
        ],
      },
      {
        title: 'Detalle de venta',
        items: [
          { label: 'Fecha', value: dateLabel(sale?.date) },
          { label: 'Producto / servicio', value: sale?.productName || sale?.name },
          { label: 'Cantidad', value: sale?.qty },
          { label: 'Importe', value: money(sale?.total || sale?.amount) },
          { label: 'Método de pago', value: sale?.paymentMethod },
          { label: 'Estado', value: sale?.status || (sale?.paid ? 'Pagada' : 'Pendiente') },
          { label: 'Notas', value: sale?.notes },
        ],
      },
    ],
  })
}

export function printCurrentAccountStatement({ clinic, client, patient, account }) {
  printDocument({
    title: 'Resumen de cuenta corriente',
    subtitle: 'Estado de deuda, pagos parciales y saldo pendiente.',
    clinic,
    signatureLabels: ['Firma cliente', 'Firma administración'],
    sections: [
      {
        title: 'Titular',
        items: [
          { label: 'Cliente', value: client?.name },
          { label: 'Teléfono', value: client?.phone },
          { label: 'Email', value: client?.email },
          { label: 'Paciente', value: patient?.name },
        ],
      },
      {
        title: 'Cuenta',
        items: [
          { label: 'Fecha', value: dateLabel(account?.date) },
          { label: 'Concepto', value: account?.concept },
          { label: 'Tipo', value: account?.type },
          { label: 'Total', value: money(account?.amount) },
          { label: 'Pagado', value: money(account?.paidAmount) },
          { label: 'Saldo', value: money(account?.balance ?? account?.pendingAmount) },
          { label: 'Estado', value: account?.status },
          { label: 'Notas', value: account?.notes },
        ],
      },
    ],
  })
}

export function printCashClosureDocument({ clinic, closure }) {
  printDocument({
    title: `Cierre de caja ${dateLabel(closure?.date)}`,
    subtitle: 'Resumen inmutable de ingresos, egresos y resultado neto del día.',
    clinic,
    signatureLabels: ['Firma caja', 'Firma administración'],
    sections: [
      {
        title: 'Resumen',
        items: [
          { label: 'Fecha', value: dateLabel(closure?.date) },
          { label: 'Ingresos', value: money(closure?.income) },
          { label: 'Egresos', value: money(closure?.expenses) },
          { label: 'Neto', value: money(closure?.net) },
          { label: 'Efectivo', value: money(closure?.cash) },
          { label: 'Transferencia', value: money(closure?.transfer) },
          { label: 'Tarjeta', value: money(closure?.card) },
          { label: 'Responsable', value: closure?.userEmail },
        ],
      },
      {
        title: 'Observaciones',
        type: 'note',
        text: closure?.notes || 'Sin observaciones.',
      },
    ],
  })
}

export function printAppointmentCertificate({ clinic, client, patient, appointment }) {
  printDocument({
    title: 'Constancia de atención / turno',
    subtitle: 'Documento para entregar al responsable del paciente.',
    clinic,
    sections: [
      {
        title: 'Datos',
        items: [
          { label: 'Fecha', value: dateLabel(appointment?.date) },
          { label: 'Hora', value: appointment?.time },
          { label: 'Servicio', value: appointment?.service },
          { label: 'Profesional', value: appointment?.professional },
          { label: 'Estado', value: appointment?.status },
          { label: 'Paciente', value: patient?.name },
          { label: 'Responsable', value: client?.name },
          { label: 'Teléfono', value: client?.phone },
        ],
      },
      {
        title: 'Notas',
        type: 'note',
        text: appointment?.notes || '-',
      },
    ],
  })
}
