# Auditoría de exportaciones PDF / Excel

Esta versión revisa que los datos mostrados en PDF y Excel sean cargables desde el sistema.

## Criterio aplicado

- Si el dato pertenece al registro principal, se edita desde la misma sección.
- Si el dato pertenece al contacto responsable, se edita desde **Clientes**.
- Si el dato pertenece a la mascota/paciente, se edita desde **Pacientes**.
- En reportes, dashboard y auditoría hay métricas calculadas o trazabilidad del sistema; no son campos editables directos.

## Secciones clínicas

- **Pacientes**: exporta datos del paciente y del contacto responsable. Los datos del paciente se editan en Pacientes; teléfono, email, DNI/CUIT y dirección se editan en Clientes.
- **Historia clínica**: exporta fecha, paciente, tipo, profesional, diagnóstico, tratamiento, importe, pago y datos vinculados del contacto/paciente. La atención se edita en Historia clínica; contacto/paciente se edita en Clientes/Pacientes.
- **Vacunas y antiparasitarios**: exporta aplicación, lote, próximo refuerzo, profesional, estado, notas y datos completos vinculados.
- **Recetas e indicaciones**: exporta diagnóstico, medicación, indicaciones, profesional, estado, notas internas y datos completos vinculados.
- **Internación y guardería**: exporta sala/canil, ingreso, alta, alimentación, medicación, importe, pago, notas y datos vinculados.

## Secciones administrativas y comerciales

- **Clientes**: todos los datos exportados se editan en Clientes.
- **Turnos**: los datos del turno se editan en Agenda; los datos de contacto/paciente se editan en Clientes/Pacientes.
- **Recordatorios**: los datos del recordatorio se editan en Recordatorios; contacto/paciente se editan en Clientes/Pacientes.
- **Cola de espera**: los datos de recepción se editan en Cola de espera; contacto/paciente se editan en Clientes/Pacientes.
- **Ventas y cuenta corriente**: la venta se carga en Ventas; contacto/paciente/producto vienen de Clientes, Pacientes y Productos.
- **Cuentas corrientes**: movimiento, vencimiento, importe y estado se editan en Cuentas corrientes; contacto se edita en Clientes.
- **Caja**: movimientos y cierres se exportan desde Caja. Los cierres son documentos de control, no deberían editarse libremente en producción.
- **Productos y stock**: todos los datos exportados se editan en Productos y stock.
- **Compras**: compra/remito se edita en Compras; proveedor/producto se editan en Proveedores y Productos.
- **Proveedores**: todos los datos exportados se editan en Proveedores.
- **Mutualismo / planes**: plan, cuota, estado y próximo cobro se editan en Mutualismo; contacto/paciente se editan en Clientes/Pacientes.

## Correcciones aplicadas

- Se eliminó el texto de marca demo “Veterinaria Genérica”. El nombre por defecto ahora es **Sistema Veterinaria**.
- Si el navegador todavía tenía datos demo viejos en `localStorage`, las exportaciones ya no imprimen “Veterinaria Genérica”.
- Los PDF con muchas columnas ya no usan una tabla angosta que se corta. Ahora cambian automáticamente a formato de fichas profesionales por registro.
- Excel mantiene todas las columnas, porque en planilla sí conviene conservar el detalle completo.
- Se eliminó la duplicación de columnas como Paciente, Especie y Raza en exportaciones clínicas.
- Se agregaron alertas visuales y confirmaciones diseñadas para altas, ediciones, eliminaciones, caja, ventas, descargas y errores.
