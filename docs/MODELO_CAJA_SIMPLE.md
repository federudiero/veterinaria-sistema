# Modelo de caja diaria compartida

## Objetivo

El sistema separa definitivamente dos conceptos:

- **Turnos médicos / Agenda**: citas veterinarias, atención clínica y recordatorios.
- **Caja diaria**: ventas, cobros, egresos, compras pagadas y cierre del día.

La caja ya no se maneja como una caja por usuario. Para una misma fecha y tenant/local se usa una única caja compartida.

## Regla principal

Para cada fecha existe un único documento operativo de caja diaria compartida:

```text
shifts/daily_YYYY-MM-DD
```

Se mantiene el campo `shiftId` por compatibilidad con ventas, caja, cuenta corriente, compras y cierres existentes. En ventas nuevas, ese `shiftId` representa la **caja diaria compartida**, no una caja individual de usuario.

## Flujo operativo

1. Ir a **Caja diaria** o **Cajas del día**.
2. Presionar **Abrir caja del día**.
3. El sistema crea o reutiliza `daily_YYYY-MM-DD`.
4. Todos los usuarios registran ventas, cobros, compras pagadas y movimientos contra esa misma caja.
5. Cada venta/cobro/movimiento mantiene auditoría del usuario que lo registró mediante los campos existentes de auditoría (`userUid`, `userEmail`) y los campos propios del documento.
6. Al finalizar, un usuario con permiso de cierre ejecuta **Cerrar caja del día**. Ese es el cierre único operativo del día.

## Qué cambió

- Ya no se crean cajas por usuario.
- Ya no se muestra “Caja de Paula”, “Caja de Juan” o similares.
- La apertura de caja usa un ID determinístico por fecha: `daily_YYYY-MM-DD`.
- Si la caja ya existe, se reutiliza. No se crea otra caja para otro usuario.
- La caja puede guardar `openedBy` / `openedByName` y `closedBy` como auditoría, pero no como dueño exclusivo.
- Ventas, cobros, compras pagadas y movimientos buscan la caja abierta por fecha, no por usuario asignado.

## Compatibilidad

No se eliminaron colecciones ni campos históricos:

- `shifts`
- `shiftId`
- `cashMovements`
- `cashClosures`
- `globalCashClosures` (histórico/compatibilidad, ya no se usa como cierre operativo desde Caja diaria)
- `sales`
- `currentAccounts`
- `purchases`

Las ventas antiguas con `shiftId` siguen siendo legibles. Las operaciones nuevas usan la caja diaria compartida.

## Permisos

- Usuarios con permiso de ventas pueden vender si hay caja diaria abierta.
- Usuarios con permiso de caja pueden registrar movimientos/cobros según el permiso existente.
- Solo usuarios con permiso `caja.close` pueden abrir/cerrar la caja diaria desde las pantallas administrativas.
- El repositorio permite operar sobre cajas compartidas abiertas sin exigir asignación individual al documento de caja.

## Corrección de cierre único

Con caja diaria compartida no corresponde mostrar ni ejecutar dos cierres distintos. La pantalla **Caja diaria** muestra una sola acción principal: **Cerrar caja del día**. El historial visible usa `cashClosures` como fuente de verdad del cierre operativo. `globalCashClosures` queda solo por compatibilidad con datos anteriores y no se ofrece como acción diaria normal.
