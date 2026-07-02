# Esquema - Turnos, ventas y caja

## Colecciones

La ruta sigue siendo:

`tenants/{tenantId}/{collection}/{docId}`

## shifts

Campos principales:

- `date`: fecha operativa del turno.
- `name`: nombre del turno, por ejemplo Manana, Tarde, Noche o Guardia.
- `startTime`: hora de inicio.
- `endTime`: hora de fin.
- `veterinarianIds`: array de hasta dos usuarios.
- `veterinarianNames`: nombres calculados para lectura/exportacion.
- `status`: `Abierto` o `Cerrado`.
- `notes`: observaciones.
- `closedAt`: fecha de cierre si aplica.
- `closedBy`: uid que cerro el turno.
- `shiftClosureId`: cierre de caja asociado.

## sales

Campos nuevos compatibles:

- `shiftId`
- `shiftName`
- `shiftDate`
- `veterinarianIds`
- `veterinarianNames`

Las ventas antiguas sin `shiftId` se muestran como `Sin turno`.

## cashMovements

Campos nuevos compatibles:

- `shiftId`
- `shiftName`
- `shiftDate`
- `veterinarianIds`
- `veterinarianNames`
- `shiftClosureId`

El cierre por turno solo marca movimientos abiertos del turno seleccionado.

## cashClosures

Campos nuevos compatibles:

- `closureType`: `shift` o `legacy`.
- `shiftId`
- `shiftName`
- `shiftDate`
- `veterinarianIds`
- `veterinarianNames`
- `globalClosureId`

## globalCashClosures

Campos principales:

- `date`
- `income`
- `expenses`
- `net`
- `byMethod`
- `shiftClosureIds`
- `shiftIds`
- `closureCount`
- `status`
- `closedAt`
- `closedBy`

## currentAccounts

Campos nuevos compatibles:

- `shiftId`
- `shiftName`
- `shiftDate`
- `veterinarianIds`
- `veterinarianNames`

## Indices

Actualizar Firestore con:

```bash
firebase deploy --only firestore:indexes
```

Consultas cubiertas:

- ventas por fecha, turno, veterinario y metodo.
- caja por fecha y turno.
- cierres por fecha y turno.
- cierres globales por fecha.
- busquedas por `searchTokens` en turnos.

## Reglas

Actualizar Firestore rules con:

```bash
firebase deploy --only firestore:rules
```

Las reglas agregan acceso explicito a:

- `shifts`
- `globalCashClosures`

