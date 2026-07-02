# Exportaciones individuales

## Cambio aplicado

Todas las pantallas basadas en `CrudPage` ahora muestran acciones por fila para generar:

- PDF individual.
- Excel individual.

Ademas, las pantallas transaccionales principales agregan acciones individuales:

- Ventas.
- Caja.
- Cierres.
- Cuentas corrientes.

## Comportamiento esperado

- El PDF individual exporta solo el registro seleccionado.
- El Excel individual exporta solo el registro seleccionado.
- Los botones generales siguen exportando el listado visible/filtrado de la pagina actual.
- No se imprime toda la base por defecto.
- Si el documento tiene muchas columnas, el PDF usa layout de ficha por bloques.
- El fallback de nombre comercial es `Sistema Veterinaria`.
- Se evita `Veterinaria Generica` como marca de salida.

## Datos incluidos

Cada exportacion usa las columnas configuradas por la pantalla:

- Datos propios del registro.
- Datos relacionados cuando la pantalla ya los resuelve.
- Fecha de emision generada en el encabezado.
- Datos de configuracion de veterinaria si existen.
- Firma/aclaracion en PDF.

## QA minimo

1. Abrir historia clinica o cualquier CRUD.
2. Usar PDF en una fila y confirmar que imprime solo esa fila.
3. Usar Excel en una fila y confirmar que contiene solo esa fila.
4. Usar exportacion general y confirmar que toma solo la pagina/listado filtrado visible.
5. Revisar que el PDF no tenga columnas cortadas en A4.

