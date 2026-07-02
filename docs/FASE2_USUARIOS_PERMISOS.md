# Fase 2 — Firebase Auth, usuarios y permisos comerciales

Esta fase convierte el login en un flujo operativo real con Firebase Auth + perfiles internos en Firestore.

## Modelo de seguridad

Cada usuario necesita dos cosas:

1. Una cuenta creada en Firebase Authentication.
2. Un documento de perfil en Firestore:

```txt
tenants/{VITE_FIREBASE_TENANT_ID}/users/{UID_DE_FIREBASE_AUTH}
```

El ID del documento debe ser exactamente el UID que muestra Firebase Authentication.

## Primer administrador

Como todavía no usamos Cloud Functions, el primer administrador se habilita manualmente desde Firebase Console.

Pasos:

1. Firebase Console → Authentication → Users.
2. Abrir el usuario creado.
3. Copiar el UID.
4. Firestore Database → crear colección/documento:

```txt
tenants/{tenantId}/users/{uid}
```

Ejemplo de documento:

```json
{
  "uid": "UID_REAL_DEL_USUARIO",
  "email": "admin@dominio.com",
  "displayName": "Administrador",
  "role": "admin",
  "active": true,
  "permissions": []
}
```

El rol `admin` tiene acceso total aunque el array `permissions` esté vacío.

## Usuarios nuevos

Después del primer administrador:

1. Creás la cuenta en Firebase Authentication.
2. Entrás al sistema con el administrador.
3. Vas a `Usuarios`.
4. Creás el perfil interno pegando el UID real de Firebase Auth.
5. Elegís rol, estado activo y permisos.

## Solicitud de acceso

Si un usuario existe en Authentication pero no tiene perfil en Firestore, el sistema muestra una pantalla de habilitación con:

- email;
- UID;
- tenant;
- ruta exacta del documento;
- JSON recomendado para primer administrador.

También puede registrar una solicitud pendiente. Esa solicitud crea un perfil con:

```json
{
  "role": "pendiente",
  "active": false,
  "permissions": []
}
```

Un administrador debe aprobarlo desde `Usuarios`.

## Roles incluidos

- `admin`: acceso total.
- `veterinario`: clínica, pacientes, agenda, internación y reportes.
- `recepcion`: clientes, pacientes, agenda, ventas y lectura de caja.
- `caja`: ventas, caja, cierre y reportes.
- `stock`: productos, stock, proveedores, compras y reportes.
- `lectura`: acceso de consulta.
- `pendiente`: sin acceso operativo.

## Permisos por ruta

Ahora las rutas no solo se ocultan del menú. También están protegidas por permiso. Si alguien intenta entrar por URL directa, ve una pantalla de acceso restringido.

## Permisos por acción

Las pantallas CRUD ahora respetan permisos de escritura:

- sin permiso `*.write`: no aparece botón crear;
- sin permiso `*.write`: no aparecen editar/eliminar;
- sin permiso de caja: no se puede cerrar caja;
- sin permiso de ventas: no se puede cobrar o eliminar venta.

## Reglas Firestore

Las reglas permiten:

- leer el propio perfil aunque esté pendiente;
- crear una solicitud propia pendiente;
- administrar usuarios solo con `usuarios.write`;
- ver auditoría solo con `auditoria.read`;
- editar configuración solo con `configuracion.write`;
- bloquear borrado del propio usuario activo para evitar dejar el sistema sin sesión administrativa accidental.

## Recomendación

Después de probar el primer admin, eliminá o cambiá cualquier contraseña compartida en chats, capturas o documentos. El sistema no guarda contraseñas en Firestore; Firebase Auth las administra por separado.
