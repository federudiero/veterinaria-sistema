# Esquema Firestore propuesto

Ruta base:

```txt
tenants/{tenantId}/{collection}/{docId}
```

Colecciones principales:

- `users`
- `settings`
- `clients`
- `patients`
- `clinicalRecords`
- `vaccines`
- `prescriptions`
- `appointments`
- `shifts`
- `waitingQueue`
- `reminders`
- `products`
- `sales`
- `currentAccounts`
- `cashMovements`
- `cashClosures`
- `globalCashClosures`
- `suppliers`
- `purchases`
- `boarding`
- `memberships`
- `auditLogs`

## Campos de búsqueda

Cada documento editable debe guardar:

```js
searchText: string
searchTokens: string[]
```

Esto permite buscar por prefijo con:

```js
where('searchTokens', 'array-contains', terminoNormalizado)
```

Ejemplos soportados:

- nombre de cliente;
- teléfono;
- DNI/CUIT;
- nombre de paciente;
- SKU;
- concepto de caja;
- factura/remito;
- profesional;
- diagnóstico.

## Campos de turnos/caja agregados en Fase 7

Los documentos comerciales siguen siendo compatibles con registros antiguos. Cuando el flujo trabaja por turno se agregan estos campos:

```js
shiftId: string
shiftName: string
shiftDate: string
veterinarianIds: string[]
veterinarianNames: string[]
shiftClosureId?: string
globalClosureId?: string
closedAt?: timestamp
closedBy?: string
```

Colecciones afectadas:

- `sales`
- `cashMovements`
- `cashClosures`
- `currentAccounts`
- `shifts`
- `globalCashClosures`

Los registros legacy sin `shiftId` deben mostrarse como `Sin turno`.

## Importante para Firestore

No usar `getDocs(collection(...))` sin límite en pantallas comerciales. Usar siempre:

- `limit(n)`;
- `where(...)` cuando haya filtro;
- `orderBy(...)` cuando el índice exista;
- paginación en UI;
- agregados precomputados para reportes pesados.
