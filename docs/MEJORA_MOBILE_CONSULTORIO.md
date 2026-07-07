# Mejora mobile consultorio

## Objetivo

Convertir la experiencia mobile en una herramienta real de consultorio: búsqueda rápida, acceso directo a pacientes, historia clínica desde la ficha del tutor, navegación inferior y formularios más cómodos en teléfono.

## Cambios aplicados

### Navegación mobile

- Se agregó barra inferior fija para teléfono con accesos rápidos.
- Se agregó panel `Más secciones` tipo bottom-sheet para módulos secundarios.
- Se conserva la navegación lateral/desktop existente.
- La venta rápida sigue disponible como acceso destacado.

Archivos:

- `src/components/layout/Layout.jsx`
- `src/styles.css`

### Clientes

- Se agregó acción `Ver pacientes` en cada cliente.
- Al abrir un cliente se muestra una ficha con datos del tutor y pacientes asociados.
- Desde cada paciente asociado se puede abrir su historia clínica.
- Se agregó botón de WhatsApp al tutor.
- Se mejoraron campos para teclado mobile: teléfono, email, DNI/CUIT, dirección.

Archivo:

- `src/features/clients/ClientsPage.jsx`

### Pacientes

- Las cards mobile ahora priorizan paciente, tutor, especie, estado, castración y alertas.
- Se agregó WhatsApp directo al tutor desde la card del paciente.
- Se conservó el botón Historia.
- Se mejoraron campos para teclado mobile.

Archivo:

- `src/features/patients/PatientsPage.jsx`

### Historia clínica

- Se agregó barra de acciones rápidas dentro del modal:
  - Nueva atención
  - Timeline
  - PDF
  - WhatsApp
- El guardado de atención queda más accesible en mobile con acciones sticky.
- No se cambiaron colecciones ni estructura de datos.

Archivo:

- `src/features/patients/PatientClinicalHistoryModal.jsx`

### Listados y filtros

- `DataTable` ahora acepta configuración mobile por sección.
- Los listados pueden definir título, subtítulo y metadatos específicos para cards mobile.
- `ListToolbar` ahora separa buscador de filtros avanzados en mobile.
- Se agregaron chips de filtros activos.

Archivos:

- `src/components/ui/DataTable.jsx`
- `src/components/ui/ListToolbar.jsx`
- `src/features/common/CrudPage.jsx`

### Formularios

- `FormField` ahora respeta `autoComplete`, `autoCapitalize`, `enterKeyHint` y `pattern`.
- Esto mejora teclados y autocompletado en mobile.

Archivo:

- `src/components/forms/FormField.jsx`

### PWA

- Se agregó `public/sw.js` con cache controlado del shell.
- Se actualizó `manifest.webmanifest` con scope, orientación, idioma, descripción y propósito maskable.
- Se registró el service worker solo en producción.

Archivos:

- `public/sw.js`
- `public/manifest.webmanifest`
- `src/main.jsx`

## Validación

Se ejecutó:

```bash
npm install --ignore-scripts --no-audit --fund=false
npm run build
```

Resultado: build correcto con Vite.

## Notas de seguridad

- No se modificaron reglas de Firestore.
- No se cambiaron nombres de colecciones.
- No se cambiaron permisos.
- No se alteró el modelo de historia clínica.
- El service worker no cachea requests a Firebase, Google APIs ni Firebase Storage.

## Ajuste posterior por prueba en teléfono - Historia clínica

Se corrigió la vista mobile del modal de historia clínica porque el encabezado, las acciones rápidas, el formulario y el footer dejaban poca área útil para leer o cargar datos clínicos.

Cambios aplicados:

- El modal de historia clínica usa clase específica `clinical-history-sheet`.
- En mobile pasa a ocupar `100dvh`, sin borde redondeado, para aprovechar toda la pantalla.
- Se oculta el footer duplicado en mobile; las acciones quedan arriba y el cierre sigue disponible en el header.
- El modal abre por defecto en `Timeline`, para revisar historia clínica antes de cargar una nueva atención.
- `Nueva atención` y `Timeline` ahora alternan paneles; ya no se muestran formulario y timeline apilados en la misma pantalla mobile.
- Se compactaron header, resumen del paciente, chips de datos, cards de timeline e inputs.
- Los textareas del formulario clínico son más bajos en mobile para mejorar la visualización inicial.
- Después de guardar una atención, vuelve automáticamente al timeline.

Archivos afectados:

- `src/components/ui/Modal.jsx`
- `src/features/patients/PatientClinicalHistoryModal.jsx`
- `src/styles.css`
