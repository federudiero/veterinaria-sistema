import React from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { ListToolbar } from '../../components/ui/ListToolbar.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { useServerCollectionControls } from '../../hooks/useServerCollectionControls.js'
import { dateLabel } from '../../utils/formatters.js'

export function AuditPage() {
  const audit = useServerCollectionControls('auditLogs', { dateField: 'createdAtISO', orderByField: 'createdAtISO', orderDirection: 'desc' })

  const columns = [
    { key: 'createdAt', label: 'Fecha', render: (row) => dateLabel(row.createdAt) },
    { key: 'userEmail', label: 'Usuario' },
    { key: 'module', label: 'Módulo' },
    { key: 'action', label: 'Acción' },
    { key: 'entityId', label: 'ID entidad' },
    { key: 'summary', label: 'Resumen' },
  ]

  return (
    <section>
      <SectionHeader
        eyebrow="Seguridad"
        title="Auditoría"
        description="Registro de acciones críticas para comercializar con control interno: altas, bajas, caja, stock, cierres y permisos."
        actions={
          <ExportButtons
            title="Auditoría del sistema"
            subtitle="Eventos filtrados de seguridad y trazabilidad operativa."
            rows={audit.items}
            columns={columns}
            summary={[{ label: 'Eventos en página', value: audit.items.length }]}
            fileLabel="auditoria"
          />
        }
      />
      <ListToolbar
        query={audit.query}
        onQueryChange={audit.setQuery}
        placeholder="Buscar por usuario, módulo, acción o ID..."
        dateFrom={audit.dateFrom}
        dateTo={audit.dateTo}
        onDateFromChange={audit.setDateFrom}
        onDateToChange={audit.setDateTo}
        onClearFilters={audit.clearFilters}
      />
      <DataTable
        rows={audit.items}
        empty="Todavía no hay eventos de auditoría."
        columns={columns}
      />
      <Pagination {...audit} onPageSizeChange={audit.setPageSize} total={audit.items.length} limit={audit.pageSize} />
    </section>
  )
}
