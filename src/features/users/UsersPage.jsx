import React from 'react'
import { createPortalAuthUser } from '../../services/firebase/portalAuth.js'
import { CrudPage } from '../common/CrudPage.jsx'
import { useLookups } from '../../hooks/useLookups.js'
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_OPTIONS,
  ROLE_LABELS,
  getRoleAccessDescription,
  getRolePermissions,
  normalizePermissions,
} from '../../data/permissions.js'

function roleTemplatePatch(role) {
  return {
    permissions: getRolePermissions(role),
    ...(role === 'cliente' ? {} : { clientId: '', portalPassword: '' }),
  }
}

async function normalizeUserPayload(payload, editing) {
  const role = payload.role || 'recepcion'
  const permissions = role === 'admin' || role === 'cliente'
    ? []
    : normalizePermissions(payload.permissions?.length ? payload.permissions : getRolePermissions(role))
  const clientId = String(payload.clientId || '').trim()
  const email = String(payload.email || '').trim().toLowerCase()
  const displayName = String(payload.displayName || payload.email || '').trim()
  const portalPassword = String(payload.portalPassword || '')
  let uid = String(payload.uid || editing?.id || '').trim()

  if (!editing && role === 'cliente' && !clientId) {
    throw new Error('Seleccioná el cliente responsable antes de crear el acceso al portal.')
  }

  if (!editing && role === 'cliente' && !uid) {
    const createdUser = await createPortalAuthUser({ email, password: portalPassword, displayName })
    uid = createdUser.uid
  }

  if (!uid) {
    throw new Error('El UID de Firebase Auth es obligatorio para usuarios internos. Para tutores portal puede generarse automático con email y contraseña.')
  }

  const { portalPassword: _portalPassword, ...safePayload } = payload

  return {
    ...safePayload,
    uid,
    email,
    displayName,
    role,
    active: Boolean(payload.active),
    permissions,
    clientId: role === 'cliente' ? clientId : '',
    clientIds: role === 'cliente' && clientId ? [clientId] : [],
  }
}

export function UsersPage() {
  const { clientOptions } = useLookups()

  return (
    <CrudPage
      collectionName="users"
      eyebrow="Seguridad"
      title="Usuarios y permisos"
      description="Perfiles internos vinculados a Firebase Auth. Al elegir un rol, el sistema carga automáticamente la plantilla segura de permisos."
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
        clientId: '',
        portalPassword: '',
      }}
      beforeSave={normalizeUserPayload}
      fields={[
        {
          name: 'uid',
          label: 'UID de Firebase Auth',
          hint: ({ form }) => form.role === 'cliente'
            ? 'Para Cliente / tutor portal podés dejarlo vacío: el sistema crea Firebase Auth y completa el UID automáticamente al guardar.'
            : 'Para usuarios internos, copiá el UID desde Firebase Console Authentication. No inventar este dato.',
        },
        { name: 'displayName', label: 'Nombre', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        {
          name: 'portalPassword',
          label: 'Contraseña inicial portal',
          type: 'password',
          disabled: ({ form }) => form.role !== 'cliente',
          hint: ({ form }) => form.role === 'cliente'
            ? 'Solo se usa al crear un tutor portal nuevo sin UID. No se guarda en Firestore; queda administrada por Firebase Auth.'
            : 'Solo aplica al rol Cliente / tutor portal.',
        },
        {
          name: 'role',
          label: 'Rol',
          type: 'select',
          options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
          hint: 'Al cambiar el rol se cargan automáticamente los permisos recomendados para ese perfil.',
          onChange: ({ value }) => roleTemplatePatch(value),
        },
        { name: 'active', label: 'Activo / habilitado', type: 'checkbox' },
        {
          name: 'clientId',
          label: 'Cliente vinculado para portal',
          type: 'select',
          options: clientOptions,
          disabled: ({ form }) => form.role !== 'cliente',
          hint: ({ form }) => form.role === 'cliente'
            ? 'Obligatorio para tutores portal. Define qué pacientes, historias, vacunas, recetas y turnos puede ver.'
            : 'Solo se usa con el rol Cliente / tutor portal.',
        },
        {
          name: 'permissions',
          label: 'Permisos automáticos del rol',
          type: 'permissionsChecklist',
          options: PERMISSION_OPTIONS,
          disabled: ({ form }) => ['admin', 'cliente', 'pendiente'].includes(form.role),
          hint: ({ form }) => getRoleAccessDescription(form.role),
        },
      ]}
      columns={[
        { key: 'displayName', label: 'Usuario' },
        { key: 'email', label: 'Email' },
        { key: 'uid', label: 'UID' },
        { key: 'role', label: 'Rol', render: (row) => ROLE_LABELS[row.role] || row.role },
        { key: 'clientId', label: 'Cliente portal', render: (row) => row.clientId || '-' },
        { key: 'active', label: 'Estado', render: (row) => row.active ? 'Activo' : 'Bloqueado / pendiente' },
        { key: 'permissions', label: 'Permisos', render: (row) => row.role === 'admin' ? 'Acceso total' : `${row.permissions?.length || 0} permisos` },
      ]}
      exportColumns={[
        { key: 'displayName', label: 'Usuario' },
        { key: 'email', label: 'Email' },
        { key: 'uid', label: 'UID' },
        { key: 'role', label: 'Rol', render: (row) => ROLE_LABELS[row.role] || row.role },
        { key: 'clientId', label: 'Cliente portal', render: (row) => row.clientId || '-' },
        { key: 'active', label: 'Activo', render: (row) => row.active ? 'Sí' : 'No' },
        { key: 'permissions', label: 'Permisos', exportValue: (row) => row.role === 'admin' ? 'Acceso total' : (row.permissions || []).join(', ') },
      ]}
    />
  )
}
