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
  const shifts = useCollection('shifts', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 50,
    orderByField: 'date',
    orderDirection: 'desc',
  })
  const sales = useCollection('sales', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 150,
    orderByField: 'date',
    orderDirection: 'desc',
  })
  const products = useCollection('products', { limitCount: 300, orderByField: 'name', orderDirection: 'asc' })
  const cash = useCollection('cashMovements', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 250,
    orderByField: 'date',
    orderDirection: 'desc',
  })
  const cashClosures = useCollection('cashClosures', {
    where: [{ field: 'date', op: '==', value: today }],
    limitCount: 60,
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
  const openCashMovements = activeCash.filter((item) => item.closed !== true)
  const cashWithoutShift = openCashMovements.filter((item) => !item.shiftId)
  const income = sumBy(activeCash.filter((item) => item.type === 'Ingreso'), (item) => item.amount)
  const expenses = sumBy(activeCash.filter((item) => item.type === 'Egreso'), (item) => item.amount)

  const shiftRows = [...shifts.items].sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || ''))).map((shift) => {
    const shiftCash = activeCash.filter((item) => item.shiftId === shift.id)
    const shiftSales = activeSales.filter((item) => item.shiftId === shift.id)
    const shiftIncome = sumBy(shiftCash.filter((item) => item.type === 'Ingreso'), (item) => item.amount)
    const shiftExpenses = sumBy(shiftCash.filter((item) => item.type === 'Egreso'), (item) => item.amount)
    const closure = cashClosures.items.find((item) => item.shiftId === shift.id)
    return {
      ...shift,
      scope: shift.cashSessionScope === 'sharedDaily' || shift.sharedDaily ? 'Compartida' : 'Legacy',
      schedule: `${shift.startTime || '-'} - ${shift.endTime || '-'}`,
      salesCount: shiftSales.length,
      salesTotal: sumBy(shiftSales, (item) => item.total),
      cashNet: shiftIncome - shiftExpenses,
      movementCount: shiftCash.length,
      closureStatus: closure ? 'Cerrada con caja' : shift.status || 'Abierto',
    }
  })
  const openShiftCount = shiftRows.filter((item) => item.status !== 'Cerrado').length
  const closedShiftCount = shiftRows.filter((item) => item.status === 'Cerrado').length

  const appointmentColumns = [
    { key: 'time', label: 'Hora' },
    { key: 'clientId', label: 'Cliente', render: (row) => clientMap[row.clientId] || '-' },
    { key: 'patientId', label: 'Paciente', render: (row) => patientMap[row.patientId] || '-' },
    { key: 'service', label: 'Servicio' },
    { key: 'status', label: 'Estado' },
  ]

  const shiftColumns = [
    { key: 'name', label: 'Caja' },
    { key: 'schedule', label: 'Horario' },
    { key: 'scope', label: 'Tipo' },
    { key: 'salesTotal', label: 'Ventas', render: (row) => `${money(row.salesTotal)} (${row.salesCount})` },
    { key: 'cashNet', label: 'Caja neta', render: (row) => money(row.cashNet) },
    { key: 'movementCount', label: 'Movimientos' },
    { key: 'closureStatus', label: 'Estado' },
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
    { label: 'Agenda clínica hoy', value: appointmentsCount.count },
    { label: 'Ventas hoy', value: money(sumBy(activeSales, (item) => item.total)) },
    { label: 'Caja diaria', value: openShiftCount ? 'Abierta' : closedShiftCount ? 'Cerrada' : 'Sin abrir' },
    { label: 'Caja neta hoy', value: money(income - expenses) },
    { label: 'Movimientos abiertos', value: openCashMovements.length },
    { label: 'Pendiente de cobro', value: money(sumBy(pendingPayments, (item) => item.total)) },
  ]

  return (
    <section>
      <SectionHeader
        eyebrow="Panel principal"
        title="Dashboard operativo"
        description="Resumen comercial del día: agenda clínica, ventas, caja diaria compartida, movimientos pendientes de cierre, stock crítico y cierres."
        actions={
          <ExportButtons
            title="Dashboard operativo"
            subtitle={`Resumen general del día ${dateLabel(today)}.`}
            rows={[
              { id: 'clients', metric: 'Clientes', value: clientsCount.count, detail: 'Conteo de servidor' },
              { id: 'patients', metric: 'Pacientes', value: patientsCount.count, detail: 'Conteo de servidor' },
              { id: 'appointments', metric: 'Agenda clínica hoy', value: appointmentsCount.count, detail: dateLabel(today) },
              { id: 'cash_shifts', metric: 'Caja diaria', value: openShiftCount ? 'Abierta' : closedShiftCount ? 'Cerrada' : 'Sin abrir', detail: `${closedShiftCount} cerradas` },
              { id: 'sales', metric: 'Ventas hoy', value: money(sumBy(activeSales, (item) => item.total)), detail: `${salesCount.count} comprobantes` },
              { id: 'pending', metric: 'Pendiente de cobro', value: money(sumBy(pendingPayments, (item) => item.total)), detail: `${pendingPayments.length} ventas leídas` },
              { id: 'cash', metric: 'Caja neta hoy', value: money(income - expenses), detail: `Ingresos ${money(income)} · Egresos ${money(expenses)}` },
              { id: 'open_cash', metric: 'Movimientos abiertos', value: openCashMovements.length, detail: cashWithoutShift.length ? `${cashWithoutShift.length} sin caja` : 'Todos con caja' },
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
        <StatCard label="Agenda clínica hoy" value={appointmentsCount.count} help={dateLabel(today)} tone="info" />
        <StatCard label="Caja diaria" value={openShiftCount ? 'Abierta' : closedShiftCount ? 'Cerrada' : 'Sin abrir'} help={dateLabel(today)} tone={openShiftCount ? 'warning' : 'success'} />
        <StatCard label="Ventas hoy" value={money(sumBy(activeSales, (item) => item.total))} help={`${salesCount.count} comprobantes`} tone="success" />
        <StatCard label="Pendiente de cobro" value={money(sumBy(pendingPayments, (item) => item.total))} help={`${pendingPayments.length} ventas leídas`} tone="warning" />
        <StatCard label="Caja neta hoy" value={money(income - expenses)} help="Ingresos menos egresos" tone="success" />
        <StatCard label="Movimientos abiertos" value={openCashMovements.length} help={cashWithoutShift.length ? `${cashWithoutShift.length} sin caja` : 'Listos para cierre de caja'} tone={openCashMovements.length ? 'warning' : 'success'} />
        <StatCard label="Stock crítico" value={lowStock.length} help="Lectura limitada" tone="danger" />
        <StatCard label="Internados" value={openBoarding.length} help="Activos / guardería" tone="info" />
      </div>

      <div className="two-column">
        <article className="panel">
          <div className="panel-title-row">
            <h2>Cajas de hoy</h2>
            <ExportButtons title="Cajas de hoy" rows={shiftRows} columns={shiftColumns} summary={summary} fileLabel="cajas-hoy" />
          </div>
          <DataTable rows={shiftRows} columns={shiftColumns} empty="No hay cajas abiertas para hoy." />
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Agenda clínica de hoy</h2>
            <ExportButtons title="Agenda clínica de hoy" rows={todaysAppointments} columns={appointmentColumns} summary={summary} fileLabel="agenda-clinica-hoy" />
          </div>
          <DataTable rows={todaysAppointments} columns={appointmentColumns} />
        </article>
      </div>

      <article className="panel panel-spaced">
        <div className="panel-title-row">
          <h2>Alertas de stock</h2>
          <ExportButtons title="Alertas de stock" rows={lowStock} columns={stockColumns} summary={summary} fileLabel="alertas-stock" />
        </div>
        <DataTable rows={lowStock} columns={stockColumns} />
      </article>
    </section>
  )
}
