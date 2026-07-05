# Roles y permisos automáticos

## Objetivo

La pantalla **Usuarios y permisos** ahora carga automáticamente una plantilla segura de permisos al seleccionar el rol.

Antes, el administrador tenía que marcar permiso por permiso. Eso era confuso y podía habilitar permisos incorrectos, especialmente para el rol **Cliente / tutor portal**.

## Funcionamiento

En `src/features/users/UsersPage.jsx`, el campo `role` usa una acción `onChange` que actualiza el campo `permissions` con `getRolePermissions(role)`.

Resultado esperado:

- Al elegir **Veterinario/a**, se marcan automáticamente los permisos clínicos, pacientes, agenda, internación, reportes y documentos.
- Al elegir **Recepción**, se marcan automáticamente clientes, pacientes, agenda, ventas, caja de lectura y documentos.
- Al elegir **Caja**, se marcan automáticamente ventas, caja, reportes y documentos.
- Al elegir **Stock / Depósito**, se marcan automáticamente stock, proveedores, compras y reportes.
- Al elegir **Solo lectura**, se marcan automáticamente permisos de lectura, sin permisos de edición.
- Al elegir **Administrador**, se muestran todos los permisos como referencia, pero en Firestore se guarda `permissions: []` porque el rol `admin` tiene acceso total por regla.
- Al elegir **Cliente / tutor portal**, no se guardan permisos internos. El acceso se limita por `role: 'cliente'` y `clientId/clientIds`.

## Seguridad del portal

El rol **Cliente / tutor portal** debe mantener:

```json
{
  "role": "cliente",
  "permissions": [],
  "clientId": "ID_DEL_CLIENTE",
  "clientIds": ["ID_DEL_CLIENTE"]
}
```

No agregar `clientes.read`, `pacientes.read`, `clinica.read` ni `agenda.read` al rol cliente.

Motivo: las reglas de Firestore permiten lectura global cuando un usuario tiene permisos internos por `hasPermission()`. Para el portal, la lectura debe pasar por las reglas específicas:

- `ownsClientDoc()`
- `ownsClientData()`
- `portalClientIds()`

Así el tutor solo puede ver documentos vinculados a su propio `clientId`.

## Archivos modificados

- `src/data/permissions.js`
- `src/features/users/UsersPage.jsx`
- `src/features/common/CrudPage.jsx`
- `src/components/forms/FormGrid.jsx`
- `src/components/forms/FormField.jsx`

## Prueba manual recomendada

1. Ir a **Usuarios y permisos**.
2. Crear un usuario nuevo.
3. Cambiar el rol entre Recepción, Caja, Veterinario/a, Stock y Solo lectura.
4. Verificar que los permisos se marcan automáticamente.
5. Elegir **Cliente / tutor portal**.
6. Verificar que el checklist queda bloqueado sin permisos internos.
7. Seleccionar el cliente vinculado.
8. Guardar.
9. Entrar a `/portal/login` con ese usuario.
10. Confirmar que solo ve pacientes y registros del cliente vinculado.
