import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout.jsx'
import { ProtectedRoute } from './routes/ProtectedRoute.jsx'
import { LoginPage } from './features/auth/LoginPage.jsx'
import { DashboardPage } from './features/dashboard/DashboardPage.jsx'
import { ClientsPage } from './features/clients/ClientsPage.jsx'
import { PatientsPage } from './features/patients/PatientsPage.jsx'
import { ClinicalRecordsPage } from './features/clinical/ClinicalRecordsPage.jsx'
import { AppointmentsPage } from './features/appointments/AppointmentsPage.jsx'
import { WaitingQueuePage } from './features/queue/WaitingQueuePage.jsx'
import { ShiftsPage } from './features/shifts/ShiftsPage.jsx'
import { RemindersPage } from './features/reminders/RemindersPage.jsx'
import { VaccinesPage } from './features/vaccines/VaccinesPage.jsx'
import { PrescriptionsPage } from './features/prescriptions/PrescriptionsPage.jsx'
import { SalesPage } from './features/sales/SalesPage.jsx'
import { QuickSalePage } from './features/sales/QuickSalePage.jsx'
import { CurrentAccountsPage } from './features/currentAccounts/CurrentAccountsPage.jsx'
import { CashPage } from './features/cash/CashPage.jsx'
import { ProductsPage } from './features/products/ProductsPage.jsx'
import { SuppliersPage } from './features/suppliers/SuppliersPage.jsx'
import { PurchasesPage } from './features/purchases/PurchasesPage.jsx'
import { FuturePurchasesPage } from './features/futurePurchases/FuturePurchasesPage.jsx'
import { BoardingPage } from './features/boarding/BoardingPage.jsx'
import { MembershipsPage } from './features/memberships/MembershipsPage.jsx'
import { ReportsPage } from './features/reports/ReportsPage.jsx'
import { UsersPage } from './features/users/UsersPage.jsx'
import { AuditPage } from './features/audit/AuditPage.jsx'
import { SettingsPage } from './features/settings/SettingsPage.jsx'
import { DocumentsPage } from './features/documents/DocumentsPage.jsx'
import { BackupPage } from './features/backup/BackupPage.jsx'
import { PermissionRoute } from './routes/PermissionRoute.jsx'
import { ROUTE_PERMISSIONS } from './data/modulePermissions.js'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
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
        <Route path="historia-clinica" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/historia-clinica']}><ClinicalRecordsPage /></PermissionRoute>} />
        <Route path="vacunas" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/vacunas']}><VaccinesPage /></PermissionRoute>} />
        <Route path="recetas" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/recetas']}><PrescriptionsPage /></PermissionRoute>} />
        <Route path="agenda" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/agenda']}><AppointmentsPage /></PermissionRoute>} />
        <Route path="recordatorios" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/recordatorios']}><RemindersPage /></PermissionRoute>} />
        <Route path="cola-espera" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/cola-espera']}><WaitingQueuePage /></PermissionRoute>} />
        <Route path="turnos-veterinarios" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/turnos-veterinarios']}><ShiftsPage /></PermissionRoute>} />
        <Route path="venta-rapida" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/venta-rapida']}><QuickSalePage /></PermissionRoute>} />
        <Route path="ventas" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/ventas']}><SalesPage /></PermissionRoute>} />
        <Route path="cuentas-corrientes" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/cuentas-corrientes']}><CurrentAccountsPage /></PermissionRoute>} />
        <Route path="caja" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/caja']}><CashPage /></PermissionRoute>} />
        <Route path="productos-stock" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/productos-stock']}><ProductsPage /></PermissionRoute>} />
        <Route path="proveedores" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/proveedores']}><SuppliersPage /></PermissionRoute>} />
        <Route path="compras" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/compras']}><PurchasesPage /></PermissionRoute>} />
        <Route path="compras-futuras" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/compras-futuras']}><FuturePurchasesPage /></PermissionRoute>} />
        <Route path="internacion" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/internacion']}><BoardingPage /></PermissionRoute>} />
        <Route path="mutualismo" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/mutualismo']}><MembershipsPage /></PermissionRoute>} />
        <Route path="reportes" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/reportes']}><ReportsPage /></PermissionRoute>} />
        <Route path="documentos" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/documentos']}><DocumentsPage /></PermissionRoute>} />
        <Route path="respaldo" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/respaldo']}><BackupPage /></PermissionRoute>} />
        <Route path="usuarios" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/usuarios']}><UsersPage /></PermissionRoute>} />
        <Route path="auditoria" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/auditoria']}><AuditPage /></PermissionRoute>} />
        <Route path="configuracion" element={<PermissionRoute permission={ROUTE_PERMISSIONS['/configuracion']}><SettingsPage /></PermissionRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
