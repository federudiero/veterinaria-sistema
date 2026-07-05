import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

function PortalPendingScreen({ user }) {
  const { logout, refreshProfile } = useAuth()

  return (
    <main className="login-screen access-request-screen">
      <section className="login-card access-card">
        <div className="brand login-brand">
          <div className="brand-mark">V+</div>
          <div>
            <strong>Portal de pacientes</strong>
            <small>Acceso pendiente</small>
          </div>
        </div>
        <h1>Tu acceso todavía no está habilitado</h1>
        <p>
          La cuenta existe, pero la veterinaria debe vincularla a tu ficha de cliente antes de mostrar historias clínicas.
        </p>
        <div className="profile-info-box">
          <span><strong>Email:</strong> {user?.email}</span>
          <span><strong>Estado:</strong> {user?.profileStatus || 'pendiente'}</span>
        </div>
        <div className="system-actions">
          <button className="btn btn-primary" onClick={refreshProfile}>Verificar de nuevo</button>
          <button className="btn btn-ghost" onClick={logout}>Cerrar sesión</button>
        </div>
      </section>
    </main>
  )
}

export function PatientPortalRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <div className="screen-loader">Cargando portal...</div>
  if (!user) return <Navigate to="/portal/login" replace state={{ from: location }} />
  if (user.active === false) return <PortalPendingScreen user={user} />
  if (user.role !== 'cliente') return <Navigate to="/dashboard" replace />

  return children
}
