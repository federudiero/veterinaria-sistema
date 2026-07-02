# Fase 6 — Deploy comercial, dominio, App Check y QA final

Esta fase convierte el sistema en una base preparada para entrega comercial.

## Incluye

- Configuración de Firebase Hosting.
- Rewrites SPA para React Router.
- Headers de seguridad básicos.
- Cache correcto para assets de Vite.
- App Check opcional preparado con reCAPTCHA v3.
- Scripts de deploy.
- Checklist de deploy.
- Página interna **Producción / Estado del sistema**.
- Variables `.env.example` y `.env.production.example`.
- Documentación para QA, cliente y demo comercial.

## Flujo recomendado de deploy

```bash
npm run safe-install
npm run qa:release
firebase deploy --only firestore:rules,firestore:indexes
npm run deploy:hosting
```

Para deploy completo en un solo comando:

```bash
npm run deploy:all
```

## Variables mínimas para producción

```env
VITE_APP_ENV=production
VITE_USE_FIREBASE=true
VITE_REQUIRE_FIREBASE=true
VITE_USE_FIREBASE_EMULATORS=false
VITE_ALLOW_LOCAL_DEMO=false
VITE_ALLOW_DEMO_SEED=false
VITE_FIREBASE_TENANT_ID=defaultVet
```

## App Check

El código ya soporta App Check con reCAPTCHA v3.

Variables:

```env
VITE_REQUIRE_APPCHECK=true
VITE_FIREBASE_APPCHECK_SITE_KEY=SITE_KEY_RECAPTCHA_V3
```

En desarrollo se puede usar:

```env
VITE_APPCHECK_DEBUG_TOKEN=true
```

Antes de venderlo, se recomienda activar App Check en Firebase Console para Firestore.

Si `VITE_REQUIRE_APPCHECK=true` y falta `VITE_FIREBASE_APPCHECK_SITE_KEY`, el sistema bloquea el arranque con un error visible. En producción también se bloquea cualquier configuración con `VITE_USE_FIREBASE_EMULATORS=true`.

## Entrega fuente limpia

El ZIP o repositorio fuente no debe incluir:

- `node_modules/`
- `dist/`
- `.env` ni `.env.*` reales
- `.firebase/`
- JSON de service account
- archivos con claves privadas

Usar `npm ci --ignore-scripts --no-audit --fund=false` en destino para regenerar dependencias y evitar binarios opcionales rotos de Rollup/Vite.

## Dominio

1. Firebase Console → Hosting.
2. Add custom domain.
3. Ingresar el dominio.
4. Configurar los DNS que indique Firebase.
5. Esperar verificación.
6. Probar login real, navegación y PDF/Excel.

## Archivos críticos

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `.firebaserc`
- `.env.production.example`
- `scripts/check-deploy.mjs`
- `src/features/systemStatus/SystemStatusPage.jsx`
