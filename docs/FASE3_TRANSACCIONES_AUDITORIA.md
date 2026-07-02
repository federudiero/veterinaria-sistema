# Fase 3 — Flujos críticos transaccionales

Esta fase convierte las operaciones sensibles en flujos seguros para producción.

## Ventas

La creación de una venta ahora se ejecuta como una operación única:

- crea la venta;
- valida stock real del producto;
- descuenta stock si es producto físico;
- crea movimiento de stock;
- si está pagada, crea ingreso de caja;
- si queda a cuenta corriente, crea deuda vinculada;
- crea evento de auditoría.

Si una parte falla, la operación no queda a medias.

## Cobro de ventas

El cobro de una venta pendiente:

- marca la venta como pagada;
- crea ingreso de caja;
- cancela la cuenta corriente vinculada si existe;
- registra auditoría.

## Anulación de ventas

Las ventas ya no se eliminan desde la UI. Se anulan con motivo obligatorio.

La anulación:

- marca la venta como `Anulada`;
- restaura stock si correspondía;
- crea movimiento de stock de reversa;
- anula el movimiento de caja abierto si existe;
- anula cuenta corriente vinculada si existe;
- bloquea la anulación si la venta ya fue incluida en un cierre de caja;
- registra auditoría.

## Compras

La creación de compra:

- crea la compra;
- suma stock;
- crea movimiento de stock;
- si está pagada, crea egreso de caja;
- registra auditoría.

## Anulación de compras

La anulación:

- marca la compra como `Anulada`;
- descuenta del stock la cantidad comprada;
- crea movimiento de stock de reversa;
- anula el egreso de caja abierto si existe;
- bloquea la anulación si la compra ya fue incluida en cierre de caja;
- registra auditoría.

## Caja

Los movimientos manuales de caja ahora pasan por una operación controlada con auditoría.

El cierre de caja:

- toma los movimientos abiertos;
- ignora movimientos anulados;
- calcula ingresos, egresos, neto y desglose por método;
- crea un cierre con ID `closure_YYYY-MM-DD`;
- bloquea doble cierre del mismo día;
- marca los movimientos como cerrados;
- registra auditoría.

## Cuentas corrientes

Los pagos de cuenta corriente:

- actualizan saldo pagado;
- calculan estado `Parcial` o `Cancelado`;
- crean ingreso de caja;
- si la deuda está vinculada a una venta y se cancela, marca la venta como pagada;
- registran auditoría.

## Auditoría automática

Además de los flujos transaccionales, las operaciones genéricas de crear, editar, eliminar y setear documentos ahora generan eventos en `auditLogs`.

Campos relevantes:

- `module`
- `action`
- `entityId`
- `summary`
- `userUid`
- `userEmail`
- `before`
- `after`
- `severity`
- `createdAt`

## Colecciones nuevas o reforzadas

- `stockMovements`
- `auditLogs`
- `cashClosures`
- `currentAccounts`

## Reglas Firestore

Se agregaron permisos para que ventas/compras puedan actualizar solo el campo `stock` del producto cuando hacen operaciones transaccionales.

También se agregó la colección `stockMovements` con creación permitida para:

- `stock.write`
- `ventas.write`
- `compras.write`

## Pendiente para Fase 4

- paginación por cursor real en Firestore;
- filtros por rango de fechas en módulos grandes;
- dashboard con agregados precalculados;
- posible migración de operaciones críticas a Cloud Functions si se pasa a Blaze.
