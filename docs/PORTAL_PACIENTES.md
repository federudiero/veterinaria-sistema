# Portal de pacientes

## Objetivo

Agregar un acceso separado para tutores/clientes sin exponer el panel administrativo. El tutor entra con usuario y contraseña de Firebase Auth y solo puede leer la información clínica vinculada a su ficha de cliente.

## Rutas

- `/portal/login`: login orientado a tutores.
- `/admin/login`: login orientado al equipo veterinario.
- `/login`: login general con selector de tipo de ingreso.
- `/portal`: portal privado del tutor.
- `/dashboard` y resto del sistema: panel administrativo interno.

## Modelo de usuario cliente

El usuario del portal también existe en Firebase Auth, pero su perfil interno debe cargarse en:

```txt
tenants/{TENANT_ID}/users/{uid}
```

Ejemplo mínimo:

```json
{
  "uid": "UID_REAL_FIREBASE_AUTH",
  "email": "cliente@email.com",
  "displayName": "Nombre del tutor",
  "role": "cliente",
  "active": true,
  "permissions": [],
  "clientId": "ID_DOCUMENTO_CLIENTE",
  "clientIds": ["ID_DOCUMENTO_CLIENTE"]
}
```

`clientId` debe coincidir con el ID del documento en `tenants/{TENANT_ID}/clients/{clientId}`. Los pacientes, historias clínicas, vacunas, recetas y turnos deben tener ese mismo `clientId` para aparecer en el portal.

## Seguridad

El portal no depende de esconder botones. Las reglas de Firestore limitan la lectura por `clientId` para roles `cliente`:

- `clients`: solo su propia ficha.
- `patients`: solo pacientes con su `clientId`.
- `clinicalRecords`: solo registros con su `clientId`.
- `vaccines`: solo aplicaciones con su `clientId`.
- `prescriptions`: solo recetas con su `clientId`.
- `appointments`: solo turnos con su `clientId`.

El cliente no tiene permisos de escritura.

## Alta operativa de un tutor

1. Crear el usuario en Firebase Authentication con email y contraseña.
2. Copiar el UID generado.
3. En el sistema, ir a `Usuarios y permisos`.
4. Crear perfil con ese UID.
5. Seleccionar rol `Cliente / tutor portal`.
6. Marcar `Activo`.
7. Vincular el campo `Cliente vinculado para portal`.
8. Guardar.
9. El tutor entra por `/portal/login`.

## Deploy necesario

Después de subir estos cambios:

```bash
npm install
npm run build
firebase deploy --only firestore:rules,firestore:indexes
```

Luego desplegar hosting según el entorno usado.
