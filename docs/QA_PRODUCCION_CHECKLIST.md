# QA final antes de entregar a cliente

## Acceso

- [ ] Login con administrador real.
- [ ] Usuario sin perfil queda bloqueado.
- [ ] Usuario inactivo queda bloqueado.
- [ ] Roles sin permiso no ven secciones restringidas.
- [ ] Cerrar sesión funciona.

## Clientes y pacientes

- [ ] Crear cliente.
- [ ] Editar cliente.
- [ ] Buscar cliente por nombre, teléfono y email.
- [ ] Crear paciente vinculado a cliente.
- [ ] Editar paciente.
- [ ] Exportar PDF/Excel.

## Clínica

- [ ] Crear historia clínica.
- [ ] Crear vacuna.
- [ ] Crear receta.
- [ ] Generar documentos profesionales.
- [ ] PDF no se corta en hoja.
- [ ] Datos del paciente/contacto aparecen correctos.

## Agenda

- [ ] Crear turno.
- [ ] Cambiar estado.
- [ ] Crear recordatorio.
- [ ] Usar cola de espera.

## Ventas, caja y stock

- [ ] Crear producto con stock.
- [ ] Crear venta pagada.
- [ ] Validar descuento de stock.
- [ ] Validar ingreso en caja.
- [ ] Crear venta pendiente.
- [ ] Validar cuenta corriente.
- [ ] Cobrar pendiente.
- [ ] Anular venta con motivo.
- [ ] Validar reversa de stock y caja.
- [ ] Cerrar caja.
- [ ] Intentar modificar movimiento cerrado y verificar bloqueo.

## Compras

- [ ] Crear proveedor.
- [ ] Crear compra pagada.
- [ ] Validar aumento de stock.
- [ ] Validar egreso en caja.
- [ ] Anular compra con motivo.

## Reportes y respaldo

- [ ] Filtrar reportes por fecha.
- [ ] Exportar PDF/Excel.
- [ ] Generar backup JSON.
- [ ] Revisar auditoría.

## Producción

- [ ] El ZIP/repo fuente no incluye `node_modules/`, `dist/`, `.env`, `.firebase/` ni service accounts.
- [ ] Existen `.env.example` y `.env.production.example` sin claves reales.
- [ ] Producción tiene `VITE_APP_ENV=production`.
- [ ] Producción tiene `VITE_REQUIRE_FIREBASE=true`.
- [ ] Producción tiene `VITE_ALLOW_LOCAL_DEMO=false`.
- [ ] Producción tiene `VITE_ALLOW_DEMO_SEED=false`.
- [ ] Producción tiene `VITE_USE_FIREBASE_EMULATORS=false`.
- [ ] Producción tiene `VITE_REQUIRE_APPCHECK=true`.
- [ ] Producción tiene `VITE_FIREBASE_APPCHECK_SITE_KEY` real de reCAPTCHA v3.
- [ ] `npm run check:release` sin errores.
- [ ] `npm run check:deploy` sin errores críticos.
- [ ] `npm run build:production` correcto.
- [ ] Reglas e índices desplegados.
- [ ] Hosting desplegado.
- [ ] Dominio conectado.
- [ ] App Check activo o decisión documentada.
