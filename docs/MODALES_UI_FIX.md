# Corrección de modales

## Problema corregido
Los modales de edición podían verse demasiado pegados al borde superior, con lectura incómoda y formularios extensos poco profesionales.

## Cambios aplicados
- Modal centralizado en `src/components/ui/Modal.jsx`.
- Bloqueo del scroll del `body` mientras el modal está abierto.
- Cierre con tecla `Escape`.
- Encabezado visible y consistente en todas las secciones.
- Cuerpo con scroll interno controlado.
- Footer fijo dentro del modal para que los botones Cancelar/Guardar queden siempre accesibles.
- Mejor responsive en móvil: modal tipo bottom-sheet.
- Campos `textarea` a ancho completo para mejorar lectura clínica.
- Checkbox rediseñado para verse profesional y no desalineado.
- Botones de footer con `type="button"` para evitar submits involuntarios.

## Archivos modificados
- `src/components/ui/Modal.jsx`
- `src/styles.css`
- `src/features/common/CrudPage.jsx`
- `src/features/cash/CashPage.jsx`
- `src/features/sales/SalesPage.jsx`
