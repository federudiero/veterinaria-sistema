# Portal de pacientes

## Objetivo

Agregar un acceso separado para tutores/clientes sin exponer el panel administrativo. El tutor entra con usuario y contraseña de Firebase Auth y solo puede leer la información clínica vinculada a su ficha de cliente.

## Rutas

- `/portal/login`: login orientado a tutores.
- `/admin/login`: login orientado al equipo veterinario.
- `/login`: login general con selector de tipo de ingreso.
- `/portal`: portal privado del tutor.
- `/dashboard` y resto del sistema: panel administrativo interno.

## Modelo correcto

Hay 3 piezas distintas y no conviene mezclarlas:

1. **Cliente / tutor responsable**: documento en `tenants/{TENANT_ID}/clients/{clientId}`.
2. **Paciente / mascota**: documento en `tenants/{TENANT_ID}/patients/{patientId}` con `clientId` del tutor responsable.
3. **Usuario portal**: usuario de Firebase Authentication + perfil interno en `tenants/{TENANT_ID}/users/{uid}`.

El paciente no tiene contraseña. La contraseña pertenece al tutor responsable y queda administrada por Firebase Authentication. No se guarda en Firestore.

## Perfil interno del usuario portal

El usuario del portal también existe en Firebase Auth, pero su perfil interno queda cargado en:

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

## Alta operativa recomendada

1. Ir a **Clientes** y crear el tutor responsable.
2. Ir a **Pacientes** y crear la mascota vinculándola al cliente responsable.
3. Ir a **Usuarios y permisos**.
4. Crear un nuevo perfil.
5. Completar nombre, email y contraseña inicial.
6. Seleccionar rol `Cliente / tutor portal`.
7. Dejar vacío `UID de Firebase Auth` si el tutor todavía no existe en Authentication.
8. Seleccionar `Cliente vinculado para portal`.
9. Marcar `Activo`.
10. Guardar.

Al guardar, el sistema crea automáticamente el usuario en Firebase Authentication, obtiene el UID real y crea el documento interno en `tenants/{TENANT_ID}/users/{uid}`.

## Cuando el email ya existe en Firebase Authentication

El frontend no puede consultar el UID de un email existente por seguridad. Si aparece `auth/email-already-in-use`, hay 2 opciones:

1. Copiar el UID existente desde Firebase Console > Authentication > Users y pegarlo en `UID de Firebase Auth`.
2. Eliminar/recrear ese usuario desde Firebase Authentication si fue una prueba incorrecta.

## Seguridad

El portal no depende de esconder botones. Las reglas de Firestore limitan la lectura por `clientId` para roles `cliente`:

- `clients`: solo su propia ficha.
- `patients`: solo pacientes con su `clientId`.
- `clinicalRecords`: solo registros con su `clientId`.
- `vaccines`: solo aplicaciones con su `clientId`.
- `prescriptions`: solo recetas con su `clientId`.
- `appointments`: solo turnos con su `clientId`.

El cliente no tiene permisos de escritura.

## Configuración Firebase necesaria

- Firebase Authentication > Sign-in method > Email/Password habilitado.
- Firestore rules desplegadas.
- Variables `VITE_FIREBASE_*` configuradas en producción.

## Deploy necesario

Después de subir estos cambios:

```bash
npm install
npm run build
firebase deploy --only firestore:rules,firestore:indexes
```

Luego desplegar hosting según el entorno usado.
