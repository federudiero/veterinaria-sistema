import React from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { ListToolbar } from '../../components/ui/ListToolbar.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useCollectionCount } from '../../hooks/useCollectionCount.js'
import { useServerCollectionControls } from '../../hooks/useServerCollectionControls.js'
import { money, sumBy } from '../../utils/formatters.js'

export function ReportsPage() {
  const sales = useServerCollectionControls('sales', { dateField: 'date', statusField: 'status', orderByField: 'date', orderDirection: 'desc', defaultPageSize: 100 })
  const cash = useServerCollectionControls('cashMovements', { dateField: 'date', statusField: 'status', orderByField: 'date', orderDirection: 'desc', defaultPageSize: 100 })
  const products = useCollection('products', { limitCount: 1000, orderByField: 'name', orderDirection: 'asc' })
  const appointmentsCount = useCollectionCount('appointments', { where: [
    ...(sales.dateFrom ? [{ field: 'date', op: '>=', value: sales.dateFrom }] : []),
    ...(sales.dateTo ? [{ field: 'date', op: '<=', value: sales.dateTo }] : []),
  ] })

  const activeSales = sales.items.filter((item) => item.status !== 'Anulada')
  const paidSales = activeSales.filter((item) => item.paid)
  const pendingSales = activeSales.filter((item) => !item.paid)
  const activeCash = cash.items.filter((item) => item.status !== 'Anulado')
  const income = sumBy(activeCash.filter((item) => item.type === 'Ingreso'), (item) => item.amount)
  const expenses = sumBy(activeCash.filter((item) => item.type === 'Egreso'), (item) => item.amount)

  const productSales = activeSales.reduce((acc, sale) => {
    ;(sale.items || []).forEach((item) => {
      if (!acc[item.productId]) acc[item.productId] = { id: item.productId, name: item.name, qty: 0, total: 0 }
      acc[item.productId].qty += Number(item.qty || 0)
      acc[item.productId].total += Number(item.qty || 0) * Number(item.price || 0)
    })
    return acc
  }, {})

  const topProducts = Object.values(productSales).sort((a, b) => b.total - a.total).slice(0, 8)
  const lowStock = products.items.filter((item) => item.type === 'Producto' && Number(item.stock) <= Number(item.minStock))

  const summary = [
    { label: 'Ventas cobradas leídas', value: money(sumBy(paidSales, (item) => item.total)) },
    { label: 'Cuentas corrientes leídas', value: money(sumBy(pendingSales, (item) => item.total)) },
    { label: 'Caja neta leída', value: money(income - expenses) },
    { label: 'Turnos del rango', value: appointmentsCount.count },
    { label: 'Stock crítico', value: lowStock.length },
  ]

  const topProductColumns = [
    { key: 'name', label: 'Producto' },
    { key: 'qty', label: 'Cantidad' },
    { key: 'total', label: 'Total', render: (row) => money(row.total) },
  ]

  const lowStockColumns = [
    { key: 'name', label: 'Producto' },
    { key: 'stock', label: 'Stock' },
    { key: 'minStock', label: 'Mínimo' },
    { key: 'category', label: 'Categoría' },
  ]

  const reportRows = [
    { id: 'paid-sales', metric: 'Ventas cobradas leídas', value: money(sumBy(paidSales, (item) => item.total)), detail: `${paidSales.length} ventas pagadas en página/rango` },
    { id: 'pending-sales', metric: 'Cuentas corrientes leídas', value: money(sumBy(pendingSales, (item) => item.total)), detail: `${pendingSales.length} ventas pendientes en página/rango` },
    { id: 'cash-net', metric: 'Caja neta leída', value: money(income - expenses), detail: `Ingresos ${money(income)} · Egresos ${money(expenses)}` },
    { id: 'appointments', metric: 'Turnos del rango', value: appointmentsCount.count, detail: 'Conteo del servidor' },
    { id: 'low-stock', metric: 'Stock crítico', value: lowStock.length, detail: 'Productos bajo mínimo en lectura limitada' },
  ]

  function syncCashDateFrom(value) {
    sales.setDateFrom(value)
    cash.setDateFrom(value)
  }

  function syncCashDateTo(value) {
    sales.setDateTo(value)
    cash.setDateTo(value)
  }

  function clearFilters() {
    sales.clearFilters()
    cash.clearFilters()
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Dirección"
        title="Reportes"
        description="Indicadores financieros, operativos y de stock con consultas por rango para evitar lecturas masivas."
        actions={
          <ExportButtons
            title="Reporte ejecutivo"
            subtitle="Resumen financiero, operativo y de stock de la página/rango actual."
            rows={reportRows}
            columns={[
              { key: 'metric', label: 'Indicador' },
              { key: 'value', label: 'Valor' },
              { key: 'detail', label: 'Detalle' },
            ]}
            summary={summary}
            fileLabel="reporte-ejecutivo"
          />
        }
      />

      <ListToolbar
        query={sales.query}
        onQueryChange={sales.setQuery}
        placeholder="Buscar ventas del reporte por cliente, paciente, producto o método..."
        dateFrom={sales.dateFrom}
        dateTo={sales.dateTo}
        onDateFromChange={syncCashDateFrom}
        onDateToChange={syncCashDateTo}
        status={sales.status}
        onStatusChange={sales.setStatus}
        statusOptions={['Activa', 'Anulada']}
        onClearFilters={clearFilters}
      />

      <div className="stats-grid">
        <StatCard label="Ventas cobradas" value={money(sumBy(paidSales, (item) => item.total))} tone="success" help={`${paidSales.length} registros leídos`} />
        <StatCard label="Cuentas corrientes" value={money(sumBy(pendingSales, (item) => item.total))} tone="warning" help={`${pendingSales.length} registros leídos`} />
        <StatCard label="Caja neta" value={money(income - expenses)} tone="info" help="Según movimientos leídos" />
        <StatCard label="Turnos del rango" value={appointmentsCount.count} help="Conteo del servidor" />
        <StatCard label="Stock crítico" value={lowStock.length} tone="danger" help="Lectura limitada" />
      </div>

      <div className="two-column two-column-wide">
        <article className="panel">
          <div className="panel-title-row">
            <h2>Productos más vendidos</h2>
            <ExportButtons title="Productos más vendidos" rows={topProducts} columns={topProductColumns} summary={summary} fileLabel="top-productos" />
          </div>
          <DataTable rows={topProducts} columns={topProductColumns} empty="No hay ventas en el rango/página actual." />
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Stock crítico</h2>
            <ExportButtons title="Stock crítico" rows={lowStock} columns={lowStockColumns} summary={summary} fileLabel="stock-critico" />
          </div>
          <DataTable rows={lowStock} columns={lowStockColumns} empty="Sin productos críticos." />
        </article>
      </div>
    </section>
  )
}
