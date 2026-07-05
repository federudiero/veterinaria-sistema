# Revisión de paginación y buscadores

## Objetivo

Asegurar que las secciones principales no dependan de cargar todos los registros en memoria cuando la veterinaria tenga más de 100 registros, y que los buscadores funcionen con nombres compuestos o textos de más de una palabra.

## Cambios aplicados

### Buscador server-side

- Se mantuvo el índice `searchTokens` para Firestore.
- Cuando el usuario escribe varias palabras, la consulta a Firestore usa el término más representativo para evitar que búsquedas como `Zira Federico` fallen por no existir como token exacto.
- En la capa local se valida que los términos escritos estén contenidos en el texto indexado, sin exigir que estén en el mismo orden exacto.

### Agenda / Turnos

Antes:
- El calendario mensual leía un bloque limitado y la tabla diaria paginaba en memoria.
- Si había muchos turnos, podía quedar corta la lectura mensual.

Ahora:
- El calendario mensual sigue cargando solo el rango visible del calendario para mostrar contexto.
- La tabla del día usa paginación por servidor real contra `appointments`.
- La búsqueda, estado, exportación y botones de página trabajan sobre el día seleccionado.

### Recordatorios / Ventas futuras

Antes:
- Leía los últimos recordatorios generales y después filtraba por día en memoria.
- Si había muchos recordatorios, podían faltar registros antiguos/futuros del día seleccionado.

Ahora:
- El calendario mensual lee solo el rango visible.
- La tabla del día usa paginación por servidor real contra `reminders`.
- Búsqueda, estado, categoría, exportación y paginación trabajan sobre el día seleccionado.

### Internación y mutualismo

- Internación ahora usa `startDate` como campo de fecha para filtros y orden.
- Mutualismo ahora usa `nextBilling` como campo de fecha para filtros y orden.

### Interfaz de paginación

- El texto ahora diferencia entre:
  - registros en página, cuando es paginación por servidor;
  - registros en vista, cuando es paginación local.
- Si hay más registros disponibles, se muestra “hay más registros”.

### Índices Firestore

Se agregaron índices para soportar filtros/paginación en:

- `appointments`
- `reminders`
- `boarding`
- `memberships`

Recordatorio: después de desplegar este ZIP, hay que ejecutar:

```bash
firebase deploy --only firestore:indexes
```

## Estado por sección

| Sección | Paginación | Buscador | Observación |
|---|---|---|---|
| Clientes | Servidor | Sí | CrudPage |
| Pacientes | Servidor | Sí | CrudPage |
| Historia clínica | Servidor | Sí | CrudPage |
| Vacunas | Servidor | Sí | CrudPage |
| Recetas | Servidor | Sí | CrudPage |
| Agenda | Servidor en tabla diaria | Sí | Corregido |
| Recordatorios | Servidor en tabla diaria | Sí | Corregido |
| Cola de espera | Servidor | Sí | CrudPage |
| Cajas del día | Servidor | Sí | CrudPage |
| Ventas | Servidor | Sí | Filtros fecha/estado/caja/método |
| Cuentas corrientes | Servidor | Sí | Filtros fecha/estado |
| Caja diaria | Servidor | Sí | Filtros fecha/estado/caja |
| Productos y stock | Servidor | Sí | CrudPage |
| Proveedores | Servidor | Sí | CrudPage |
| Compras | Servidor | Sí | Filtros fecha/estado |
| Compras futuras | Servidor | Sí | CrudPage |
| Internación | Servidor | Sí | Filtro de fecha corregido a ingreso |
| Mutualismo | Servidor | Sí | Filtro de fecha corregido a próximo cobro |
| Usuarios | Servidor | Sí | CrudPage |
| Auditoría | Servidor | Sí | Filtros fecha/buscador |

## Límite de exportación

La exportación sigue limitada al máximo seguro configurado para evitar lecturas masivas. Actualmente usa paginación interna hasta `MAX_EXPORT_ROWS`.
