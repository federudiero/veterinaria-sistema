# Revisión pre-producción

Fecha de revisión: 2026-07-05

## Validaciones ejecutadas

- `npm ci --ignore-scripts --no-audit --fund=false`
- `npm run build`
- `npm run qa:release`
- `npm run check:deploy`
- Validación JSON de `firestore.indexes.json`.
- Revisión estática de rutas, permisos, caja diaria, ventas, cuenta corriente, compras, agenda, exportaciones y reglas Firestore.

## Resultado técnico

- El build de Vite compila correctamente.
- No hay errores de importación o JSX detectados por build.
- El modelo de caja queda como caja diaria compartida usando `shiftId` compatible.
- Cada venta, cobro y movimiento conserva auditoría por usuario con `userUid` y `userEmail`.
- La acción visible de cierre queda unificada como cierre de caja diaria.

## Correcciones aplicadas en esta revisión

1. Fechas locales
   - Se corrigió `todayISO()` para usar fecha local, no UTC.
   - Impacto: evita que en Argentina, después de la noche, el sistema abra/cierre caja con fecha del día siguiente por error.

2. Venta rápida
   - Se corrigió el cambio de método de pago.
   - Si el usuario elige Cuenta corriente y luego vuelve a Efectivo/Transferencia/Debito/Credito, la venta vuelve a quedar pagada automáticamente.

3. Agenda
   - La agenda ya no depende de los últimos 300 turnos globales.
   - Ahora lee por rango visible del calendario mensual para evitar que falten turnos cuando haya más datos.

4. Seguridad de caja
   - Se bloqueó la eliminación visual de cajas del día desde la pantalla CRUD.
   - Se restringió escritura de `shifts` en Firestore a usuarios con permiso `caja.close`.

5. Índices Firestore
   - Se agregaron índices compuestos para combinaciones de filtros en Ventas y Caja diaria.
   - Objetivo: evitar errores de “missing index” al combinar búsqueda, caja, estado, método y fecha.

6. Demo/local
   - Se actualizó la semilla local para usar caja diaria compartida `daily_YYYY-MM-DD`.

## Advertencias antes de producción

`npm run check:deploy` sigue marcando advertencias por configuración de entorno, no por código:

- `VITE_APP_ENV` debe estar en `production`.
- `VITE_REQUIRE_FIREBASE` debe estar en `true`.
- `VITE_ALLOW_LOCAL_DEMO` debe estar en `false`.
- `VITE_ALLOW_DEMO_SEED` debe estar en `false`.
- App Check/reCAPTCHA v3 no está configurado como obligatorio en el `.env` actual.

Para producción real, configurar esas variables en Vercel/Firebase Hosting antes del despliegue.

## Pruebas manuales recomendadas antes de mostrar

1. Login con usuario admin.
2. Abrir Caja diaria.
3. Abrir caja del día.
4. Crear venta rápida en efectivo.
5. Crear venta normal con transferencia.
6. Crear venta a cuenta corriente.
7. Cobrar cuenta corriente.
8. Crear compra pagada y confirmar egreso.
9. Crear movimiento manual de caja.
10. Cerrar caja del día.
11. Intentar vender con caja cerrada: debe bloquear.
12. Revisar Dashboard, Ventas, Caja diaria, Cuentas corrientes y Productos/Stock.
13. Probar en celular:
    - menú horizontal superior,
    - formularios modales,
    - tablas en tarjetas,
    - venta rápida,
    - agenda.

## Pendientes no bloqueantes

- App Check debe activarse antes de comercializar si se publica a clientes reales.
- Las listas de selección de clientes/pacientes/productos cargan hasta el límite seguro actual; si la veterinaria supera varios cientos de registros, conviene implementar buscadores server-side en selects.
- No hay suite automatizada de tests unitarios/e2e; la validación actual es build + revisión estática + checklist manual.
