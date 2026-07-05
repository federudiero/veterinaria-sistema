> Nota vigente: este documento describe el modelo anterior con cierre por turno y cierre global. En el modelo actual de caja diaria compartida, la operación normal usa un único cierre visible: **Cerrar caja del día**. `globalCashClosures` queda solo para compatibilidad/histórico y no se muestra como cierre operativo en Caja diaria.

# Fase 7 - Turnos, ventas y caja

## Objetivo

Esta fase agrega soporte comercial para operar ventas y caja por turno veterinario, manteniendo compatibilidad con ventas, cuentas corrientes y cierres anteriores sin turno.

## Flujo operativo

1. Crear el turno del dia desde `Turnos veterinarios`.
2. Asignar hasta dos veterinarios activos al turno.
3. Registrar ventas seleccionando un turno abierto.
4. Los cobros inmediatos generan movimientos de caja con `shiftId`.
5. Las ventas pendientes generan cuenta corriente con los datos del turno.
6. Los pagos de cuenta corriente requieren turno abierto y generan caja.
7. La caja se filtra por turno y se cierra turno por turno.
8. El cierre global diario consolida los cierres de turno del dia.

## Validaciones aplicadas

- Venta nueva: requiere turno abierto salvo usuario admin.
- Movimiento manual de caja: requiere turno abierto.
- Pago de cuenta corriente: requiere turno abierto.
- Repositorio Firestore/local: rechaza operaciones sobre turnos cerrados cuando reciben `shiftId`.
- Cierre de caja por turno: cierra solo movimientos del turno seleccionado.
- Cierre global: concepto histórico del modelo anterior. En la operación actual se usa un único cierre: **Cerrar caja del día**.
- Ventas legacy sin turno siguen visibles como `Sin turno`.

## Permisos

- `agenda.read`: leer turnos.
- `agenda.write`: crear/editar turnos.
- `ventas.write`: registrar/cobrar/anular ventas.
- `caja.write`: movimientos de caja y pagos de cuenta corriente.
- `caja.close`: cierres de turno y cierre global.

## QA recomendado

1. Crear turno del dia con dos veterinarios.
2. Registrar venta pagada en efectivo.
3. Registrar venta pendiente en cuenta corriente.
4. Cobrar cuenta corriente desde su seccion.
5. Filtrar ventas por dia, turno, veterinario, metodo y estado.
6. Ver caja filtrada por el turno.
7. Cerrar caja del turno.
8. Intentar cargar movimiento en turno cerrado y validar bloqueo.
9. Crear/cerrar todos los turnos del dia.
10. Ejecutar cierre global.
11. Exportar PDF/Excel individual de venta, movimiento, cierre y cuenta corriente.

