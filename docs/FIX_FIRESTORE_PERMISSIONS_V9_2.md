# Fix v9.2 — Firestore rules y perfil de usuario

## Causa probable del error

El usuario existe en Firebase Authentication y el perfil está creado en:

`tenants/defaultVet/users/{uid}`

pero Firestore sigue respondiendo:

`Missing or insufficient permissions`

Esto suele pasar por una de estas causas:

1. Las reglas locales `firestore.rules` no fueron desplegadas al proyecto real.
2. La app está conectada al emulador, pero el perfil se creó en Firestore real.
3. El tenant del `.env` no coincide con la ruta del documento.
4. Falta permiso sobre alguna colección nueva del tenant.

## Cambios aplicados

- El usuario autenticado puede leer siempre su propio documento en `users/{uid}`.
- El admin activo puede operar cualquier subcolección del tenant como fallback controlado.
- `settings` puede leerse por cualquier usuario activo.
- `permissions` se valida como lista antes de usar `permission in permissions`.

## Comandos recomendados

### Producción / Firebase real

```powershell
firebase use veterinariavet
firebase deploy --only firestore:rules,firestore:indexes
```

### Verificar ambiente local

El `.env` debe tener:

```env
VITE_USE_FIREBASE=true
VITE_USE_FIREBASE_EMULATORS=false
VITE_FIREBASE_TENANT_ID=defaultVet
```

Después reiniciar Vite:

```powershell
npm run dev
```

### Si usás emuladores

El perfil debe crearse también en el Firestore Emulator, no solo en Firebase Console.
