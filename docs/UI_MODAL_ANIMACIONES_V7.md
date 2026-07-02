# UI Modales y animaciones v7

## Causa raíz corregida

Los modales estaban renderizados dentro de cada sección. Como las páginas tienen animaciones con `transform`, el `position: fixed` del modal quedaba relativo al contenedor animado y no al viewport completo. Por eso el modal se veía desplazado, cortado o con el overlay limitado a la zona de contenido.

## Cambios aplicados

- `Modal.jsx` ahora usa `createPortal` y renderiza en `document.body`.
- El overlay cubre toda la pantalla, incluida la barra lateral.
- El modal tiene estructura fija: header, body con scroll interno y footer siempre visible.
- Se bloquea el scroll del fondo mientras el modal está abierto.
- Se agregó cierre con `Escape`.
- Se agregó foco inicial y ciclo básico de foco con `Tab` dentro del modal.
- En desktop el modal queda centrado y compacto.
- En móvil funciona como bottom sheet.
- Se mejoraron transiciones de páginas, tablas, cards, botones, inputs, toasts y confirmaciones.

## Archivos principales

- `src/components/ui/Modal.jsx`
- `src/components/layout/Layout.jsx`
- `src/styles.css`
