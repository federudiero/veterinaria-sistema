import React, { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { QuickSalePage } from '../sales/QuickSalePage.jsx'
import { SalesPage } from '../sales/SalesPage.jsx'
import { CashPage } from '../cash/CashPage.jsx'
import { CurrentAccountsPage } from '../currentAccounts/CurrentAccountsPage.jsx'
import { ShiftsPage } from '../shifts/ShiftsPage.jsx'

const SALES_CASH_TABS = [
  {
    id: 'venta-rapida',
    label: 'Venta rápida',
    description: 'Mostrador, cobro, stock y cuenta corriente desde una carga corta.',
    permission: 'ventas.read',
    Component: QuickSalePage,
  },
  {
    id: 'ventas',
    label: 'Ventas del día',
    description: 'Listado, filtros, comprobantes, anulación y exportación de ventas.',
    permission: 'ventas.read',
    Component: SalesPage,
  },
  {
    id: 'caja',
    label: 'Caja diaria',
    description: 'Ingresos, egresos, apertura y cierre de la caja compartida del día.',
    permission: 'caja.read',
    Component: CashPage,
  },
  {
    id: 'cuentas-corrientes',
    label: 'Cuentas corrientes',
    description: 'Deudas, pagos parciales, cancelaciones y cobros pendientes.',
    permission: 'caja.read',
    Component: CurrentAccountsPage,
  },
  {
    id: 'cajas-del-dia',
    label: 'Cajas del día',
    description: 'Aperturas, estado e historial de cajas diarias.',
    permission: 'caja.read',
    Component: ShiftsPage,
  },
]

export function SalesCashPage() {
  const { hasPermission } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') || ''

  const visibleTabs = useMemo(
    () => SALES_CASH_TABS.filter((tab) => hasPermission(tab.permission)),
    [hasPermission],
  )
  const activeTab = useMemo(() => {
    if (!visibleTabs.length) return null
    return visibleTabs.find((tab) => tab.id === requestedTab) || visibleTabs[0]
  }, [requestedTab, visibleTabs])

  useEffect(() => {
    if (!activeTab) return
    if (requestedTab === activeTab.id) return
    setSearchParams({ tab: activeTab.id }, { replace: true })
  }, [activeTab, requestedTab, setSearchParams])

  const ActiveComponent = activeTab?.Component || null

  return (
    <section className="sales-cash-page">
      <SectionHeader
        eyebrow="Comercial"
        title="Ventas y caja"
        description="Centro único para vender, cobrar, abrir o cerrar caja, revisar movimientos y gestionar cuentas corrientes sin saltar entre secciones. Las rutas anteriores siguen funcionando y redirigen acá."
      />

      {visibleTabs.length === 0 ? (
        <div className="panel empty-state-card">
          <h2>No tenés permisos comerciales habilitados</h2>
          <p className="muted">Para usar esta sección necesitás permisos de ventas o caja.</p>
        </div>
      ) : (
        <>
          <div className="module-tabs sales-cash-tabs" role="tablist" aria-label="Módulos de ventas y caja">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`module-tab ${activeTab?.id === tab.id ? 'active' : ''}`}
                onClick={() => setSearchParams({ tab: tab.id })}
                role="tab"
                aria-selected={activeTab?.id === tab.id}
              >
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </button>
            ))}
          </div>

          <div className="embedded-module sales-cash-module" key={activeTab?.id}>
            {ActiveComponent && <ActiveComponent />}
          </div>
        </>
      )}
    </section>
  )
}
