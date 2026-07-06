import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { PatientPortalRoute } from './routes/PatientPortalRoute.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { DashboardPage } from './features/dashboard/DashboardPage.jsx'
import { ClientsPage } from './features/clients/ClientsPage.jsx'
import { PatientsPage } from './features/patients/PatientsPage.jsx'
import { AgendaCenterPage } from './features/agendaCenter/AgendaCenterPage.jsx'
import { PurchasesPage } from './features/purchases/PurchasesPage.jsx'
import { SalesCashPage } from './features/salesCash/SalesCashPage.jsx'
import { BoardingPage } from './features/boarding/BoardingPage.jsx'
import { MembershipsPage } from './features/memberships/MembershipsPage.jsx'
import { ReportsPage } from './features/reports/ReportsPage.jsx'
import { SystemCenterPage } from './features/systemCenter/SystemCenterPage.jsx'
import { PatientPortalPage } from './features/portal/PatientPortalPage.jsx'
import { PermissionRoute } from './routes/PermissionRoute.jsx'
import { ROUTE_PERMISSIONS } from './data/modulePermissions.js'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage defaultMode="admin" />} />
      <Route path="/portal/login" element={<LoginPage defaultMode="portal" />} />
      <Route path="/portal" element={<PatientPortalRoute><PatientPortalPage /></PatientPortalRoute>} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="clientes" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/clientes']}><ClientsPage /></PermissionRoute>} />
        <Route path="pacientes" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/pacientes']}><PatientsPage /></PermissionRoute>} />

        <Route path="historia-clinica" element={<Navigate to="/pacientes" replace />} />
        <Route path="vacunas" element={<Navigate to="/pacientes" replace />} />
        <Route path="recetas" element={<Navigate to="/pacientes" replace />} />

        <Route path="agenda" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/agenda']}><AgendaCenterPage /></PermissionRoute>} />
        <Route path="recordatorios" element={<Navigate to="/agenda?tab=recordatorios" replace />} />
        <Route path="cola-espera" element={<Navigate to="/agenda?tab=cola-espera" replace />} />
        <Route path="turnos-veterinarios" element={<Navigate to="/agenda?tab=turnos" replace />} />

        <Route path="ventas-caja" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/ventas-caja']}><SalesCashPage /></PermissionRoute>} />
        <Route path="cajas-del-dia" element={<Navigate to="/ventas-caja?tab=cajas-del-dia" replace />} />
        <Route path="turnos-caja" element={<Navigate to="/ventas-caja?tab=cajas-del-dia" replace />} />
        <Route path="venta-rapida" element={<Navigate to="/ventas-caja?tab=venta-rapida" replace />} />
        <Route path="ventas" element={<Navigate to="/ventas-caja?tab=ventas" replace />} />
        <Route path="cuentas-corrientes" element={<Navigate to="/ventas-caja?tab=cuentas-corrientes" replace />} />
        <Route path="caja" element={<Navigate to="/ventas-caja?tab=caja" replace />} />

        <Route path="compras" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/compras']}><PurchasesPage /></PermissionRoute>} />
        <Route path="productos-stock" element={<Navigate to="/compras?tab=products" replace />} />
        <Route path="proveedores" element={<Navigate to="/compras?tab=suppliers" replace />} />
        <Route path="compras-futuras" element={<Navigate to="/compras?tab=future" replace />} />

        <Route path="internacion" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/internacion']}><BoardingPage /></PermissionRoute>} />
        <Route path="mutualismo" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/mutualismo']}><MembershipsPage /></PermissionRoute>} />
        <Route path="reportes" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/reportes']}><ReportsPage /></PermissionRoute>} />

        <Route path="sistema" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/sistema']}><SystemCenterPage /></PermissionRoute>} />
        <Route path="documentos" element={<Navigate to="/sistema?tab=documentos" replace />} />
        <Route path="respaldo" element={<Navigate to="/sistema?tab=respaldo" replace />} />
        <Route path="usuarios" element={<Navigate to="/sistema?tab=usuarios" replace />} />
        <Route path="auditoria" element={<Navigate to="/sistema?tab=auditoria" replace />} />
        <Route path="etiquetas" element={<Navigate to="/sistema?tab=etiquetas" replace />} />
        <Route path="configuracion" element={<Navigate to="/sistema?tab=configuracion" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
