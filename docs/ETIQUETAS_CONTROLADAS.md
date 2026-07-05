# Etiquetas controladas por sección

Se implementó un sistema de etiquetas reutilizable y controlado.

## Modelo

Colección nueva:
- `tags`

Cada etiqueta guarda:
- `name`: nombre visible.
- `color`: color pastel predefinido.
- `scopes`: secciones donde aplica.
- `active`: permite desactivar sin borrar histórico.
- `notes`: observación interna.

Cada registro etiquetable guarda:
- `tagIds`: IDs de etiquetas asignadas.
- `tagNames`: nombres al momento de guardar, usados para búsqueda/exportación.

## Secciones integradas

Con edición, visualización, filtro por etiqueta y exportación:
- Clientes
- Pacientes
- Historia clínica
- Vacunas
- Recetas
- Productos y stock
- Proveedores
- Compras futuras
- Cola de espera
- Cajas del día
- Internación
- Mutualismo
- Agenda
- Ventas

## Configuración

Nueva ruta:
- `/etiquetas`

Nueva opción de menú:
- `Etiquetas`

Permisos:
- lectura: `configuracion.read`
- escritura: `configuracion.write`

## Firestore

Se agregó regla explícita para `tags`:
- cualquier usuario activo puede leer etiquetas.
- solo configuración/admin puede escribir etiquetas.

Se agregaron índices para filtrar por `tagIds` con paginación/orden por fecha o actualización.

## Compatibilidad

No se rompe ningún registro previo. Los campos `tagIds` y `tagNames` son opcionales.
Los registros existentes simplemente aparecen sin etiquetas hasta que se editen.
