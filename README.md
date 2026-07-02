# Sistema Veterinaria Comercial

Sistema veterinario React + Vite preparado para operar con Firebase Auth, Firestore y Firebase Hosting.

## Estado de esta versión

Versión: `6.0.0`  
Fase: **deploy comercial, dominio, App Check y QA final**.

Incluye:

- login real con Firebase Auth;
- perfiles internos por tenant en Firestore;
- roles y permisos por sección;
- clientes, pacientes, historia clínica, vacunas, recetas y agenda;
- ventas, caja, stock, compras, cuentas corrientes y cierres;
- auditoría operativa;
- documentos profesionales PDF/Excel;
- respaldo JSON;
- paginación y filtros para alto volumen;
- App Check preparado;
- Firebase Hosting configurado;
- checklist interno de producción;
- documentación de QA y manual de cliente.

## Instalación segura

```bash
npm run safe-install
npm run dev
```

## Variables de entorno

Para desarrollo:

```bash
copy .env.example .env
```

Para producción:

```bash
copy .env.production.example .env
```

No compartas `.env`, service accounts ni claves privadas.

## Producción

Variables recomendadas:

```env
VITE_APP_ENV=production
VITE_USE_FIREBASE=true
VITE_REQUIRE_FIREBASE=true
VITE_ALLOW_LOCAL_DEMO=false
VITE_ALLOW_DEMO_SEED=false
VITE_USE_FIREBASE_EMULATORS=false
```

## App Check

El sistema ya está preparado para App Check con reCAPTCHA v3.

```env
VITE_REQUIRE_APPCHECK=true
VITE_FIREBASE_APPCHECK_SITE_KEY=TU_SITE_KEY
```

Activarlo antes de comercializar reduce llamadas no autorizadas desde clientes externos.

## Scripts principales

```bash
npm run check:release
npm run check:deploy
npm run build:production
npm run deploy:firestore
npm run deploy:hosting
npm run deploy:all
```

## Deploy recomendado

```bash
npm run safe-install
npm run qa:release
firebase deploy --only firestore:rules,firestore:indexes
npm run deploy:hosting
```

## Primer administrador

Crear usuario en Firebase Auth y luego ejecutar:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
npm run bootstrap:admin -- --uid "UID_REAL" --email "admin@cliente.com" --name "Administrador" --role admin --tenant "defaultVet"
```

El script crea:

```txt
tenants/defaultVet/users/{uid}
```

## Checklist antes de entregar

1. `npm run check:release` sin errores.
2. `npm run check:deploy` sin errores críticos.
3. `npm run build:production` correcto.
4. Reglas e índices desplegados.
5. Hosting desplegado.
6. Dominio conectado.
7. Login real probado.
8. Usuario admin creado.
9. Datos de veterinaria cargados en Configuración.
10. App Check activo o decisión documentada.

## Documentación

- `docs/FASE6_DEPLOY_COMERCIAL_QA.md`
- `docs/QA_PRODUCCION_CHECKLIST.md`
- `docs/MANUAL_CLIENTE_OPERATIVO.md`
- `docs/DEMO_COMERCIAL_GUIA.md`
- `docs/FASE5_DOCUMENTOS_BRANDING_RESPALDO.md`
- `docs/FASE4_PERFORMANCE_FIRESTORE.md`
- `docs/FASE3_TRANSACCIONES_AUDITORIA.md`
- `docs/FASE2_USUARIOS_PERMISOS.md`
- `docs/FASE1_PRODUCCION_REAL.md`

## ZIP fuente

Antes de entregar un ZIP de código fuente:

```bash
npm run clean
npm run check:release
```

No incluir:

- `node_modules/`
- `dist/`
- `.env`
- `.firebase/`
- service accounts JSON
- claves privadas
