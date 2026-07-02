import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export function AccessDeniedPage({ permission }) {
  return (
    <section className="access-denied-panel">
      <div className="system-card system-card-danger">
        <div className="system-icon">!</div>
        <p className="eyebrow">Acceso restringido</p>
        <h1>No tenés permiso para entrar a esta sección</h1>
        <p>Tu usuario no tiene habilitado el permiso requerido para este módulo.</p>
        {permission && <p className="muted">Permiso requerido: <strong>{permission}</strong></p>}
        <div className="system-actions">
          <Link className="btn btn-primary" to="/dashboard">Volver al dashboard</Link>
        </div>
      </div>
    </section>
  )
}

export function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth()
  if (!permission || hasPermission(permission)) return children
  return <AccessDeniedPage permission={permission} />
}
