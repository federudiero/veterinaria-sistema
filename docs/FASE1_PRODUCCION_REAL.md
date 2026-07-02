# Fase 1 — Preparación real para producción

Esta fase convierte la base demo en una app más segura para operar con Firebase real.

## Cambios incluidos

- Firebase obligatorio cuando `VITE_APP_ENV=production` o `VITE_REQUIRE_FIREBASE=true`.
- Bloqueo del arranque si faltan variables obligatorias de Firebase.
- Modo local demo permitido solo en desarrollo.
- Datos demo deshabilitables por ambiente con `VITE_ALLOW_DEMO_SEED=false`.
- Pantalla de error global con `ErrorBoundary`.
- Pantalla de configuración inicial obligatoria de la veterinaria.
- Versión visible en login/sidebar.
- Scripts de limpieza y checklist de release.
- `.env.example` y `.env.production.example` sin valores reales.
- ZIP fuente sin `node_modules`, `dist` ni `.env`.

## Variables críticas de producción

```env
VITE_APP_ENV=production
VITE_USE_FIREBASE=true
VITE_REQUIRE_FIREBASE=true
VITE_ALLOW_LOCAL_DEMO=false
VITE_ALLOW_DEMO_SEED=false
VITE_USE_FIREBASE_EMULATORS=false
```

## Flujo de primer arranque

1. El usuario inicia sesión con Firebase Auth.
2. El sistema lee `tenants/{tenantId}/users/{uid}`.
3. Si el usuario está activo, intenta leer `tenants/{tenantId}/settings/app`.
4. Si no existe configuración comercial completa, muestra la pantalla obligatoria de datos de veterinaria.
5. Al guardar, esos datos alimentan PDF, Excel, reportes y encabezados comerciales.

## Documento mínimo de usuario en Firestore

Ruta:

```txt
tenants/defaultVet/users/{uid}
```

Ejemplo:

```json
{
  "displayName": "Administrador",
  "email": "admin@cliente.com",
  "role": "admin",
  "active": true,
  "permissions": []
}
```

El rol `admin` tiene acceso total desde frontend y reglas.

## Comandos recomendados

Instalación segura:

```bash
npm run safe-install
```

Desarrollo:

```bash
npm run dev
```

Build de producción:

```bash
npm run build:production
```

Limpieza antes de preparar ZIP fuente:

```bash
npm run clean
```

Chequeo antes de entregar:

```bash
npm run check:release
```

## Advertencia

Esta fase no resuelve todavía transacciones críticas de venta/stock/caja. Eso queda para la Fase 3. La Fase 1 asegura que producción no arranque accidentalmente en localStorage, que exista configuración comercial inicial y que errores no controlados muestren una pantalla segura.
