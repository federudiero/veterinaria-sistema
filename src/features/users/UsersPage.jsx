import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_OPTIONS,
  ROLE_LABELS,
  getRolePermissions,
  normalizePermissions,
} from '../../data/permissions.js'

function normalizeUserPayload(payload, editing) {
  const role = payload.role || 'recepcion'
  const permissions = role === 'admin'
    ? []
    : normalizePermissions(payload.permissions?.length ? payload.permissions : getRolePermissions(role))

  return {
    ...payload,
    uid: String(payload.uid || editing?.id || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    displayName: String(payload.displayName || payload.email || '').trim(),
    role,
    active: Boolean(payload.active),
    permissions,
  }
}

export function UsersPage() {
  return (
    <CrudPage
      collectionName="users"
      eyebrow="Seguridad"
      title="Usuarios y permisos"
      description="Perfiles internos vinculados a Firebase Auth. El ID del documento debe ser el UID real del usuario de Authentication."
      createLabel="Nuevo perfil de usuario"
      searchFields={['uid', 'displayName', 'email', 'role']}
      documentIdField="uid"
      initialValues={{
        uid: '',
        displayName: '',
        email: '',
        role: 'recepcion',
        active: true,
        permissions: DEFAULT_ROLE_PERMISSIONS.recepcion,
      }}
      beforeSave={normalizeUserPayload}
      fields={[
        {
          name: 'uid',
          label: 'UID de Firebase Auth',
          required: true,
          hint: 'Copialo desde Firebase Console > Authentication > Users. Debe coincidir exactamente con el UID del usuario.',
        },
        { name: 'displayName', label: 'Nombre', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        {
          name: 'role',
          label: 'Rol',
          type: 'select',
          options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
          hint: 'Administrador ignora el listado de permisos y tiene acceso total.',
        },
        { name: 'active', label: 'Activo / habilitado', type: 'checkbox' },
        {
          name: 'permissions',
          label: 'Permisos específicos',
          type: 'permissionsChecklist',
          options: PERMISSION_OPTIONS,
        },
      ]}
      columns={[
        { key: 'displayName', label: 'Usuario' },
        { key: 'email', label: 'Email' },
        { key: 'uid', label: 'UID' },
        { key: 'role', label: 'Rol', render: (row) => ROLE_LABELS[row.role] || row.role },
        { key: 'active', label: 'Estado', render: (row) => row.active ? 'Activo' : 'Bloqueado / pendiente' },
        { key: 'permissions', label: 'Permisos', render: (row) => row.role === 'admin' ? 'Acceso total' : `${row.permissions?.length || 0} permisos` },
      ]}
      exportColumns={[
        { key: 'displayName', label: 'Usuario' },
        { key: 'email', label: 'Email' },
        { key: 'uid', label: 'UID' },
        { key: 'role', label: 'Rol', render: (row) => ROLE_LABELS[row.role] || row.role },
        { key: 'active', label: 'Activo', render: (row) => row.active ? 'Sí' : 'No' },
        { key: 'permissions', label: 'Permisos', exportValue: (row) => row.role === 'admin' ? 'Acceso total' : (row.permissions || []).join(', ') },
      ]}
    />
  )
}
