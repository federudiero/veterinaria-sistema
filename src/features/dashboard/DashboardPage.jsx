import React from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { StatCard } from '../../components/ui/StatCard.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { useCollection } from '../../hooks/useCollection.js'
import { useCollectionCount } from '../../hooks/useCollectionCount.js'
import { useLookups } from '../../hooks/useLookups.js'
import { dateLabel, money, sumBy, todayISO } from '../../utils/formatters.js'

export function DashboardPage() {
  const today = todayISO()
  const clientsCount = useCollectionCount('clients')
  const patientsCount = useCollectionCount('patients')
  const appointmentsCount = useCollectionCount('appointments', { where: [{ field: 'date', op: '==', value: today }] })
  const salesCount = useCollectionCount('sales', { where: [{ field: 'date', op: '==', value: today }] })
  const appointments = useCollection('appointments', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 50,
    orderByField: 'time',
    orderDirection: 'asc',
  })
  const sales = useCollection('sales', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 100,
    orderByField: 'date',
    orderDirection: 'desc',
  })
  const products = useCollection('products', { limitCount: 300, orderByField: 'name', orderDirection: 'asc' })
  const cash = useCollection('cashMovements', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 150,
    orderByField: 'date',
    orderDirection: 'desc',
  })
  const boarding = useCollection('boarding', { limitCount: 100, orderByField: 'updatedAt', orderDirection: 'desc' })
  const { clientMap, patientMap } = useLookups()

  const todaysAppointments = appointments.items
  const activeSales = sales.items.filter((item) => item.status !== 'Anulada')
  const pendingPayments = activeSales.filter((item) => !item.paid)
  const lowStock = products.items.filter((item) => item.type === 'Producto' && Number(item.stock) <= Number(item.minStock))
  const openBoarding = boarding.items.filter((item) => item.status !== 'Alta')
  const activeCash = cash.items.filter((item) => item.status !== 'Anulado')
  const income = sumBy(activeCash.filter((item) => item.type === 'Ingreso'), (item) => item.amount)
  const expenses = sumBy(activeCash.filter((item) => item.type === 'Egreso'), (item) => item.amount)

  const appointmentColumns = [
    { key: 'time', label: 'Hora' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'service', label: 'Servicio' },
    { key: 'status', label: 'Estado' },
  ]

  const stockColumns = [
    { key: 'name', label: 'Producto' },
    { key: 'stock', label: 'Stock' },
    { key: 'minStock', label: 'Mínimo' },
    { key: 'category', label: 'Categoría' },
  ]

  const summary = [
    { label: 'Clientes', value: clientsCount.count },
    { label: 'Pacientes', value: patientsCount.count },
    { label: 'Turnos hoy', value: appointmentsCount.count },
    { label: 'Ventas hoy', value: money(sumBy(activeSales, (item) => item.total)) },
    { label: 'Pendiente de cobro', value: money(sumBy(pendingPayments, (item) => item.total)) },
    { label: 'Caja neta hoy', value: money(income - expenses) },
    { label: 'Stock crítico', value: lowStock.length },
    { label: 'Internados', value: openBoarding.length },
  ]

  return (
    <section>
      <SectionHeader
        eyebrow="Panel principal"
        title="Dashboard operativo"
        description="Resumen rápido con consultas limitadas y conteos del servidor para no cargar colecciones completas."
        actions={
          <ExportButtons
            title="Dashboard operativo"
            subtitle={`Resumen general del día ${dateLabel(today)}.`}
            rows={[
              { id: 'clients', metric: 'Clientes', value: clientsCount.count, detail: 'Conteo de Firestore' },
              { id: 'patients', metric: 'Pacientes', value: patientsCount.count, detail: 'Conteo de Firestore' },
              { id: 'appointments', metric: 'Turnos de hoy', value: appointmentsCount.count, detail: dateLabel(today) },
              { id: 'sales', metric: 'Ventas de hoy', value: money(sumBy(activeSales, (item) => item.total)), detail: `${salesCount.count} comprobantes` },
              { id: 'pending', metric: 'Pendiente de cobro', value: money(sumBy(pendingPayments, (item) => item.total)), detail: `${pendingPayments.length} ventas leídas` },
              { id: 'cash', metric: 'Caja neta hoy', value: money(income - expenses), detail: `Ingresos ${money(income)} · Egresos ${money(expenses)}` },
              { id: 'stock', metric: 'Stock crítico', value: lowStock.length, detail: 'Productos bajo mínimo en lectura limitada' },
              { id: 'boarding', metric: 'Internados', value: openBoarding.length, detail: 'Activos / guardería' },
            ]}
            columns={[
              { key: 'metric', label: 'Indicador' },
              { key: 'value', label: 'Valor' },
              { key: 'detail', label: 'Detalle' },
            ]}
            summary={summary}
            fileLabel="dashboard-operativo"
          />
        }
      />

      <div className="stats-grid">
        <StatCard label="Clientes" value={clientsCount.count} help="Conteo del servidor" />
        <StatCard label="Pacientes" value={patientsCount.count} help="Conteo del servidor" />
        <StatCard label="Turnos hoy" value={appointmentsCount.count} help={dateLabel(today)} tone="info" />
        <StatCard label="Ventas hoy" value={money(sumBy(activeSales, (item) => item.total))} help={`${salesCount.count} comprobantes`} tone="success" />
        <StatCard label="Pendiente de cobro" value={money(sumBy(pendingPayments, (item) => item.total))} help={`${pendingPayments.length} ventas leídas`} tone="warning" />
        <StatCard label="Caja neta hoy" value={money(income - expenses)} help="Ingresos menos egresos" tone="success" />
        <StatCard label="Stock crítico" value={lowStock.length} help="Lectura limitada" tone="danger" />
        <StatCard label="Internados" value={openBoarding.length} help="Activos / guardería" tone="info" />
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-title-row">
            <h2>Turnos de hoy</h2>
            <ExportButtons title="Turnos de hoy" rows={todaysAppointments} columns={appointmentColumns} summary={summary} fileLabel="turnos-hoy" />
          </div>
          <DataTable rows={todaysAppointments} columns={appointmentColumns} />
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Alertas de stock</h2>
            <ExportButtons title="Alertas de stock" rows={lowStock} columns={stockColumns} summary={summary} fileLabel="alertas-stock" />
          </div>
          <DataTable rows={lowStock} columns={stockColumns} />
        </article>
      </div>
    </section>
  )
}
