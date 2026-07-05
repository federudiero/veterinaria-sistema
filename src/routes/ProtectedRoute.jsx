import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { TENANT_ID } from '../services/firebase/config.js'
import { InitialSetupGate } from './InitialSetupGate.jsx'

function PendingAccessScreen({ user }) {
  const { requestAccess, refreshProfile, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const hasProfile = user?.profileExists && user?.profileStatus !== 'missing'

  async function submitRequest(event) {
    event.preventDefault()
    setWorking(true)
    setError('')
    try {
      await requestAccess(displayName)
    } catch (err) {
      setError(err?.message || 'No se pudo registrar la solicitud de acceso.')
    } finally {
      setWorking(false)
    }
  }

  async function retry() {
    setWorking(true)
    try {
      await refreshProfile()
    } finally {
      setWorking(false)
    }
  }

  const adminJson = `{
  "uid": "${user?.uid || 'UID_DEL_USUARIO'}",
  "email": "${user?.email || 'email@dominio.com'}",
  "displayName": "${displayName || user?.email || 'Administrador'}",
  "role": "admin",
  "active": true,
  "permissions": []
}`

  return (
    <main className="login-screen access-request-screen">
      <section className="login-card access-card">
        <div className="brand login-brand">
          <div className="brand-mark">V+</div>
          <div>
            <strong>Sistema Veterinaria</strong>
            <small>Habilitación de usuario</small>
          </div>
        </div>
        <h1>{hasProfile ? 'Usuario pendiente de aprobación' : 'Tu usuario todavía no tiene perfil'}</h1>
        <p>
          La cuenta existe en Firebase Auth, pero necesita un perfil activo en Firestore para operar dentro del tenant.
        </p>
        <div className="profile-info-box">
          <span><strong>Email:</strong> {user?.email}</span>
          <span><strong>UID:</strong> {user?.uid}</span>
          <span><strong>Tenant:</strong> {TENANT_ID}</span>
          <span><strong>Documento:</strong> tenants/{TENANT_ID}/users/{user?.uid}</span>
        </div>

        {!hasProfile && (
          <form onSubmit={submitRequest} className="login-form">
            <label className="field">
              <span>Nombre visible</span>
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Nombre y apellido" />
            </label>
            {error && <div className="alert alert-danger">{error}</div>}
            <button className="btn btn-primary full" disabled={working}>{working ? 'Registrando...' : 'Registrar solicitud de acceso'}</button>
          </form>
        )}

        <article className="manual-bootstrap-box">
          <h2>Primer administrador</h2>
          <p>
            Para el primer acceso, copiá este perfil en Firestore con ID igual al UID del usuario. Después de eso, este admin ya puede habilitar usuarios desde la sección Usuarios.
          </p>
          <pre>{adminJson}</pre>
        </article>

        <div className="system-actions">
          <button className="btn" onClick={retry} disabled={working}>Ya lo cargué, verificar</button>
          <button className="btn btn-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </section>
    </main>
  )
}

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="screen-loader">Cargando sistema...</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (user.role === 'cliente') return <Navigate to="/portal" replace />
  if (user.active === false) return <PendingAccessScreen user={user} />
  return <InitialSetupGate>{children}</InitialSetupGate>
}
