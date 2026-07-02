# Fase 4 — Performance para alto volumen

Esta fase prepara el sistema para operar con más clientes, pacientes y movimientos sin cargar colecciones completas en memoria.

## Cambios principales

- Listados CRUD con paginación por cursor Firestore.
- Búsqueda server-side con `searchTokens`.
- Filtros por rango de fechas (`Desde` / `Hasta`) en módulos con campo `date`.
- Filtro por estado cuando la sección tiene campo `status`.
- Reportes y dashboard con lecturas limitadas y conteos del servidor.
- Exportación PDF/Excel de la página/rango actual para evitar lecturas masivas accidentales.
- Nuevos índices compuestos en `firestore.indexes.json`.

## Módulos afectados

- Clientes.
- Pacientes.
- Historia clínica.
- Turnos.
- Cola de espera.
- Vacunas.
- Recetas.
- Productos.
- Proveedores.
- Usuarios.
- Ventas.
- Caja.
- Compras.
- Cuentas corrientes.
- Auditoría.
- Dashboard.
- Reportes.

## Decisión de diseño

Para producción, la UI ya no intenta traer “todo” para después filtrar en pantalla. El flujo correcto es:

1. Buscar con `searchTokens`.
2. Filtrar por fecha/estado en Firestore.
3. Ordenar por campo indexado.
4. Leer solo una página.
5. Avanzar con cursor.

## Exportaciones

Los botones PDF/Excel exportan lo que está visible en la consulta actual. Esto es intencional: exportar 20.000 documentos desde el navegador puede congelar el equipo y disparar lecturas innecesarias.

Para una futura fase, si el cliente necesita exportaciones masivas, conviene hacerlo con Cloud Functions o un proceso backend por rango de fechas.

## Comando obligatorio después de esta fase

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Validación local

```bash
npm run safe-install
npm run build
npm run dev
```

## Nota sobre índices

Si Firestore muestra un enlace de creación de índice, significa que apareció una combinación de filtros no cubierta. Agregar ese índice a `firestore.indexes.json` y desplegarlo.
