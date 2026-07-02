# Checklist para comercializar Sistema Veterinaria

## Estado actual incluido en este ZIP

- Frontend React + Vite estructurado por módulos.
- Firebase Auth + Firestore preparados.
- Sin Storage para evitar obligación inicial de Blaze.
- Multi-tenant por ruta `tenants/{tenantId}`.
- Reglas Firestore por rol/permisos.
- Búsqueda indexada por `searchTokens` y `searchText`.
- Lecturas limitadas por defecto para no traer colecciones completas.
- Tablas con buscador y paginación.
- Módulos clínicos y administrativos principales.

## Pendiente antes de vender como SaaS completo

1. Alta real de usuarios desde backend o consola Firebase Auth.
2. Script de seed inicial por veterinaria/tenant.
3. Auditoría automática en create/update/delete. La colección existe; falta enganchar cada acción crítica.
4. Validaciones de negocio más estrictas: no stock negativo, cierre irreversible/anulable con permisos, caja por fecha.
5. Exportación PDF/Excel de historia clínica, recetas, caja y reportes.
6. Tests mínimos de flujos críticos.
7. Backup/exportación diaria de Firestore.
8. Pantalla comercial de onboarding y datos de la clínica.
9. Revisión legal: términos, privacidad y consentimiento de datos clínicos.
10. Deploy con dominio, SSL, variables `.env` y reglas publicadas.

## Escalabilidad mínima diseñada

Para 300+ clientes y muchos movimientos:

- No se debe renderizar todo junto.
- Las listas principales usan límite de lectura.
- Las tablas tienen paginación.
- Los documentos guardan `searchTokens` para buscar por prefijo.
- Firestore requiere índices para consultas por fecha, estado y paciente.

## Próxima mejora técnica recomendada

Agregar Cloud Functions solo cuando pases a Blaze o cuando el cliente lo pague:

- creación segura de usuarios;
- auditoría automática;
- reportes agregados diarios/mensuales;
- PDFs oficiales;
- recordatorios automáticos;
- integración WhatsApp/Email;
- backups programados.

## Exportaciones profesionales agregadas

- Todas las secciones operativas tienen botones **PDF** y **Excel**.
- El botón **PDF** abre una impresión profesional del navegador; desde ahí se puede imprimir en papel o guardar como PDF.
- El botón **Excel** descarga un `.xls` compatible con Excel/LibreOffice sin agregar dependencias externas.
- Los reportes usan los datos configurados en **Configuración**: nombre de veterinaria, CUIT, dirección, teléfono y email.
- En módulos clínicos y administrativos relacionados a pacientes, la exportación agrega datos extendidos:
  - contacto/responsable;
  - teléfono;
  - email;
  - DNI/CUIT;
  - dirección;
  - paciente;
  - especie;
  - raza;
  - sexo;
  - nacimiento;
  - peso;
  - microchip;
  - alergias;
  - alertas clínicas.
- Las exportaciones respetan el buscador/filtro actual para evitar imprimir listados innecesarios.
- No se agregó `jspdf`, `xlsx` ni paquetes externos para reducir superficie de riesgo npm.
