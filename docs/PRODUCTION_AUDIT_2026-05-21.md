# Auditoria de produccion - 2026-05-21

## Resumen

Proyecto revisado para entrega comercial con foco en build, Firebase, reglas, deploy, App Check, permisos, seguridad de fuente, formularios, paginacion y componentes principales.

## Cambios aplicados

- Se agregaron `.env.example` y `.env.production.example` sin secretos.
- Se amplio `.gitignore` para `.env.*`, service accounts y claves privadas.
- `build:production` ahora ejecuta `check:deploy` antes de compilar.
- Firebase Hosting suma `Content-Security-Policy` compatible con Firebase y App Check reCAPTCHA v3.
- Runtime bloquea emuladores si el build corre en produccion.
- Firestore permite lectura de backup completo solo a admin o usuarios con `backup.write`; escritura por fallback queda solo para admin.
- Auditoria usa `createdAtISO` para filtros por rango y orden, evitando queries invalidas por desigualdad en Firestore.
- Paginacion sincroniza cambios de tamano de pagina.
- Tablas muestran correctamente valores validos `0` y `false`.
- Formularios en modales usan submit real asociado al form, para no saltar validaciones `required`.
- Documentacion actualizada para App Check, fuente limpia, QA y bootstrap admin sin emails reales.

## Revision componente por componente

| Archivo | Estado | Problema encontrado | Cambio aplicado | Riesgo | Accion manual |
|---|---|---|---|---|---|
| `src/App.jsx` | OK | Rutas protegidas con `ProtectedRoute` y `PermissionRoute`; imports resueltos. | Sin cambios. | Bajo | No |
| `src/main.jsx` | OK | `RuntimeGate` envuelve Auth antes de inicializar rutas. | Sin cambios. | Bajo | No |
| `src/components/export/ExportButtons.jsx` | OK | Exporta pagina/rango actual; sin imports rotos. | Sin cambios. | Bajo | No |
| `src/components/forms/FormField.jsx` | OK | Labels presentes, selects filtrables, permisos agrupados. | Sin cambios. | Bajo | No |
| `src/components/forms/FormGrid.jsx` | OK | Render simple de campos. | Sin cambios. | Bajo | No |
| `src/components/layout/Layout.jsx` | OK | Navegacion filtrada por permisos. | Sin cambios. | Bajo | No |
| `src/components/system/ErrorBoundary.jsx` | OK | Error visible; `console.error` solo para error no controlado. | Sin cambios. | Bajo | No |
| `src/components/system/RuntimeGate.jsx` | OK | Errores de runtime claros. | Sin cambios. | Bajo | No |
| `src/components/ui/DataTable.jsx` | Corregido | `0` y `false` se mostraban como `-`. | Uso de `??` para preservar valores validos. | Bajo | No |
| `src/components/ui/ListToolbar.jsx` | OK | Filtros controlados y responsive. | Sin cambios. | Bajo | No |
| `src/components/ui/Modal.jsx` | OK | Portal, foco, Escape y scroll bloqueado. | Sin cambios. | Bajo | No |
| `src/components/ui/Pagination.jsx` | OK | Controles de pagina y tamano. | Sin cambios. | Bajo | No |
| `src/components/ui/SectionHeader.jsx` | OK | Header reutilizable. | Sin cambios. | Bajo | No |
| `src/components/ui/StatCard.jsx` | OK | Tarjeta de metricas. | Sin cambios. | Bajo | No |
| `src/components/ui/StatusBadge.jsx` | OK | Badge de estado. | Sin cambios. | Bajo | No |
| `src/contexts/AuthContext.jsx` | OK | Perfil por tenant, bloqueo inactivo/pendiente. | Sin cambios. | Medio | Crear perfiles reales |
| `src/contexts/FeedbackContext.jsx` | OK | Toasts y confirmaciones reemplazan alerts nativos. | Sin cambios. | Bajo | No |
| `src/routes/ProtectedRoute.jsx` | OK | Bloquea no autenticados e inactivos. | Sin cambios. | Bajo | No |
| `src/routes/PermissionRoute.jsx` | OK | Bloquea acceso directo por URL sin permiso. | Sin cambios. | Bajo | No |
| `src/routes/InitialSetupGate.jsx` | OK | Obliga datos comerciales en Firebase. | Sin cambios. | Bajo | Cargar datos reales |
| `src/hooks/useCollection.js` | OK | Lectura limitada via repositorio. | Sin cambios. | Bajo | No |
| `src/hooks/useCollectionCount.js` | OK | Usa conteos del servidor. | Sin cambios. | Bajo | No |
| `src/hooks/useDataControls.js` | OK | Uso local no critico. | Sin cambios. | Bajo | No |
| `src/hooks/useDebouncedValue.js` | OK | Debounce estable. | Sin cambios. | Bajo | No |
| `src/hooks/useLookups.js` | OK | Lookups limitados a 300. | Sin cambios. | Medio | Monitorear clientes grandes |
| `src/hooks/usePagedCollection.js` | Corregido | Cambiar page size desde UI no afectaba la consulta real. | Sincronizacion de `options.limitCount` con estado interno. | Bajo | No |
| `src/hooks/useServerCollectionControls.js` | OK | Filtros server-side por busqueda, fecha y estado. | Sin cambios. | Bajo | No |
| `src/hooks/useClinicSettings.js` | OK | Defaults seguros de branding. | Sin cambios. | Bajo | No |
| `src/services/firebase/config.js` | Corregido | Emuladores podian quedar activos en build de produccion. | `firebaseStartupError` bloquea `VITE_USE_FIREBASE_EMULATORS=true` en produccion. | Bajo | No |
| `src/services/firebase/client.js` | OK | Inicializa Firebase y App Check solo con config valida. | Sin cambios. | Bajo | Cargar site key real |
| `src/services/repositories/repositoryFactory.js` | OK | Sin fallback local silencioso en produccion. | Sin cambios. | Bajo | No |
| `src/services/repositories/firestoreRepository.js` | OK | Rutas `tenants/{tenantId}/{collection}` y lecturas con `limit`. | Sin cambios. | Medio | Desplegar rules/indexes |
| `src/services/repositories/localRepository.js` | OK | Solo demo local habilitado fuera de produccion. | Sin cambios. | Bajo | No |
| `src/features/common/CrudPage.jsx` | Corregido | Boton de guardar en modal podia saltar validacion HTML. | Submit real con `form` asociado. | Bajo | No |
| `src/features/auth/LoginPage.jsx` | OK | Demo visible solo si runtime lo permite. | Sin cambios. | Bajo | No |
| `src/features/dashboard/DashboardPage.jsx` | OK | Conteos server-side y lecturas limitadas. | Sin cambios. | Medio | Considerar agregados backend a futuro |
| `src/features/clients/ClientsPage.jsx` | OK | CRUD con busqueda indexada y permisos. | Sin cambios. | Bajo | No |
| `src/features/patients/PatientsPage.jsx` | OK | CRUD con lookups y export contacto. | Sin cambios. | Bajo | No |
| `src/features/clinical/ClinicalRecordsPage.jsx` | OK | Fecha, paciente y export clinico. | Sin cambios. | Bajo | No |
| `src/features/vaccines/VaccinesPage.jsx` | OK | Calendario sanitario con filtros. | Sin cambios. | Bajo | No |
| `src/features/prescriptions/PrescriptionsPage.jsx` | OK | Recetas con validaciones requeridas. | Sin cambios. | Bajo | No |
| `src/features/appointments/AppointmentsPage.jsx` | OK | Agenda protegida y paginada. | Sin cambios. | Bajo | No |
| `src/features/reminders/RemindersPage.jsx` | OK | Recordatorios paginados y buscables. | Sin cambios. | Bajo | No |
| `src/features/queue/WaitingQueuePage.jsx` | OK | Cola con permisos agenda. | Sin cambios. | Bajo | No |
| `src/features/sales/SalesPage.jsx` | Corregido | Submit de venta/anulacion podia saltar validacion nativa. | Forms con `id` y botones `submit`. | Bajo | No |
| `src/features/currentAccounts/CurrentAccountsPage.jsx` | Corregido | Submit de cobro/manual podia saltar validacion nativa. | Forms con `id` y botones `submit`. | Bajo | No |
| `src/features/cash/CashPage.jsx` | Corregido | Submit de movimiento podia saltar validacion nativa. | Form asociado al boton submit. | Bajo | No |
| `src/features/products/ProductsPage.jsx` | OK | Stock readOnly; trazabilidad por ventas/compras. | Sin cambios. | Bajo | No |
| `src/features/suppliers/SuppliersPage.jsx` | OK | CRUD proveedor con busqueda. | Sin cambios. | Bajo | No |
| `src/features/purchases/PurchasesPage.jsx` | Corregido | Submit de compra/anulacion podia saltar validacion nativa. | Forms con `id` y botones `submit`. | Bajo | No |
| `src/features/boarding/BoardingPage.jsx` | OK | Internacion con importes y paciente/contacto. | Sin cambios. | Bajo | No |
| `src/features/memberships/MembershipsPage.jsx` | OK | Planes paginados y exportables. | Sin cambios. | Bajo | No |
| `src/features/reports/ReportsPage.jsx` | OK | Reportes por rango y pagina actual. | Sin cambios. | Medio | Agregados backend si crece mucho |
| `src/features/documents/DocumentsPage.jsx` | OK | Documentos limitados a recientes; manejo de seleccion. | Sin cambios. | Medio | Backend para historicos masivos |
| `src/features/backup/BackupPage.jsx` | OK | Backup limitado a 300 por coleccion; reglas alineadas con `backup.write`. | Sin cambios en UI. | Alto | Asignar permiso solo a roles confiables |
| `src/features/users/UsersPage.jsx` | OK | Perfiles por UID real; permisos normalizados. | Sin cambios. | Medio | Crear usuario Auth real |
| `src/features/audit/AuditPage.jsx` | Corregido | Filtro por `createdAtISO` ordenaba por otro campo, query invalida en Firestore. | Orden por `createdAtISO`. | Bajo | Desplegar indice |
| `src/features/settings/SettingsPage.jsx` | OK | Seed demo oculto si env lo bloquea. | Sin cambios. | Bajo | Cargar datos reales |
| `src/features/systemStatus/SystemStatusPage.jsx` | OK | Checklist runtime visible. | Sin cambios. | Bajo | Completar App Check/env |
| `src/utils/search.js` | OK | Tokens normalizados para busqueda. | Sin cambios. | Bajo | No |
| `src/utils/formatters.js` | OK | Moneda/fecha soportan Timestamp. | Sin cambios. | Bajo | No |
| `src/utils/exporters.js` | OK | Exporta vista actual; no depende de paquetes externos. | Sin cambios. | Bajo | No |
| `src/utils/patientExportColumns.js` | OK | Export clinico con contacto. | Sin cambios. | Bajo | No |
| `src/utils/professionalDocuments.js` | OK | Impresion profesional desde navegador. | Sin cambios. | Medio | QA visual con datos reales |
