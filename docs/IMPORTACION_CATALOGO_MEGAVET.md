# Importación del catálogo Megavet a Firestore

## Alcance

La aplicación incluye un catálogo estático generado a partir de `LISTA Nº2 JULIO - 3.pdf`.
El archivo contiene 880 productos únicos y se encuentra en:

```text
public/catalogs/megavet-lista-2-julio-3.json
```

La importación se ejecuta desde la sesión autenticada del sistema, por lo que no requiere compartir credenciales ni claves privadas.

## Procedimiento

1. Desplegar la versión actualizada del frontend.
2. Ingresar con un usuario que tenga el permiso `stock.write`.
3. Abrir **Compras e inventario**.
4. Entrar en **Productos y stock**.
5. Presionar **Importar lista Megavet**.
6. Revisar el resumen y confirmar **Importar 880 productos**.

Los documentos se escriben en:

```text
tenants/{tenantId}/products/{productId}
```

`tenantId` se obtiene de `VITE_FIREBASE_TENANT_ID` y conserva el mismo comportamiento que el resto del sistema.

## Mapeo de columnas

| PDF | Firestore |
|---|---|
| Nombre + presentación | `name` |
| Precio | `cost` |
| Público | `price` |
| KG / presentación | `presentation` y `unit` |

Además se guardan especie, marca, categoría y trazabilidad del origen.

## Comportamiento seguro

- Los productos nuevos se crean con `stock: 0` y `minStock: 0`.
- No se elimina ningún producto existente.
- Si el producto ya existe, se actualizan catálogo, costo y precio.
- En una reimportación se conservan `stock`, `minStock` y `active` del producto existente.
- Los documentos tienen un identificador determinístico para evitar duplicados.
- También se compara el nombre normalizado para reutilizar productos existentes con el mismo nombre exacto.
- La operación se divide en lotes de 200 productos, por debajo del máximo de escrituras de un batch de Firestore.
- Se genera auditoría por cada lote importado.
- El único producto cuyo precio público figura en cero se crea inactivo.

## Datos de origen que requieren revisión comercial

La importación conserva literalmente los valores visibles en la lista del proveedor. No corrige automáticamente nombres, presentaciones ni importes que parezcan atípicos. Esto evita modificar datos comerciales sin confirmación.

Antes de vender se recomienda revisar:

- productos con precio cero;
- presentaciones ambiguas o posiblemente mal impresas;
- nombres con errores tipográficos del proveedor;
- vigencia de precios;
- stock físico real.

## Reimportaciones

La misma lista puede importarse nuevamente para corregir o actualizar precios. La reimportación es idempotente respecto de los identificadores del catálogo y no reinicia el stock operativo.
