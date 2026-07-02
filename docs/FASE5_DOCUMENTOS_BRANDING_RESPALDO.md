# Fase 5 — Documentos profesionales, branding y respaldo operativo

Esta fase convierte la base operativa en un producto más presentable para comercialización.

## Nuevas secciones

### Centro de documentos
Ruta: `/documentos`

Permite generar PDF profesionales para:

- Historia clínica completa por paciente.
- Carnet sanitario / vacunas.
- Receta e indicación médica.
- Recibo de venta.
- Resumen de cuenta corriente.
- Cierre de caja.
- Constancia de atención / turno.

Los documentos toman datos desde:

- `settings/app`: datos de la veterinaria y branding.
- `clients`: datos del responsable.
- `patients`: datos del paciente.
- módulos operativos vinculados.

No usa Storage. El logo puede configurarse como URL pública HTTPS o se usan iniciales.

### Respaldo y continuidad
Ruta: `/respaldo`

Genera un JSON operativo con las colecciones principales del tenant. En esta fase se limita a 300 documentos por colección para evitar lecturas masivas desde navegador.

Para backups históricos completos conviene agregar backend / Cloud Functions en una fase posterior.

## Configuración ampliada

La sección Configuración ahora permite cargar:

- Nombre comercial.
- Razón social.
- CUIT.
- Dirección.
- Teléfono.
- Email.
- Sitio web.
- Instagram.
- URL de logo.
- Iniciales del logo.
- Color principal HEX.
- Matrícula / responsable técnico.
- Leyenda al pie de documentos.

Estos datos se usan en PDF, Excel y documentos profesionales.

## Permisos agregados

- `documentos.read`
- `backup.read`
- `backup.write`

El rol `admin` mantiene acceso total por bypass de rol.

## Limitaciones conscientes

- No se suben archivos porque Storage está fuera para evitar Blaze.
- Los PDF se generan desde impresión del navegador.
- El backup JSON desde frontend no reemplaza un backup server-side programado.
