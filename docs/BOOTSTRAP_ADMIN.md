# Cargar primer administrador en Firestore

Este proyecto usa Firebase Auth para login y Firestore para el perfil interno del usuario.

Un usuario creado en Authentication todavía no puede operar si no existe este documento:

```txt
tenants/{VITE_FIREBASE_TENANT_ID}/users/{UID_DE_AUTH}
```

## Comando

1. En Firebase Console, abrir Authentication y copiar el UID real del usuario.
2. En Firebase Console, descargar una Service Account desde Project settings > Service accounts > Generate new private key.
3. Guardar ese JSON fuera del repositorio.
4. Ejecutar:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\service-account.json"
npm run bootstrap:admin -- --uid "UID_REAL_DE_AUTH" --email "admin@cliente.com" --name "Administrador" --role admin
```

El script toma `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_TENANT_ID` desde `.env`.
También se pueden pasar manualmente:

```powershell
npm run bootstrap:admin -- --project "TU_PROJECT_ID" --tenant "TU_TENANT_ID" --uid "UID_REAL_DE_AUTH" --email "admin@cliente.com" --name "Administrador" --role admin --serviceAccount "C:\ruta\service-account.json"
```

No subir nunca el JSON de service account a GitHub, ZIPs ni hosting.
