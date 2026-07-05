import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { isFirebaseMode, isLocalDemoMode } from '../../services/repositories/repositoryFactory.js'
import { APP_VERSION } from '../../config/runtime.js'

export function LoginPage({ defaultMode = 'admin' }) {
  const { user, login, error } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(isLocalDemoMode ? 'admin@vetgest.local' : '')
  const [password, setPassword] = useState(isLocalDemoMode ? '123456' : '')
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState(defaultMode)

  if (user) {
    const requestedPath = location.state?.from?.pathname || ''
    const destination = user.role === 'cliente' ? '/portal' : (requestedPath.startsWith('/portal') ? '/dashboard' : requestedPath || '/dashboard')
    return <Navigate to={destination} replace />
  }

  const isPortalMode = mode === 'portal'

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    try {
      await login(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="brand login-brand">
          <div className="brand-mark">V+</div>
          <div>
            <strong>{isPortalMode ? 'Portal de pacientes' : 'Sistema Veterinaria'}</strong>
            <small>{isFirebaseMode ? 'Ingreso seguro con Firebase Auth' : 'Demo local sin Firebase'}</small>
          </div>
        </div>

        <h1>{isPortalMode ? 'Ingresar al portal' : 'Sistema veterinario completo'}</h1>
        <p>{isPortalMode ? 'Acceso para tutores responsables: historial clínico, vacunas, recetas y turnos visibles.' : 'Gestión clínica, comercial, stock, caja, internación, mutualismo y reportes.'}</p>

        <div className="login-mode-switch" role="group" aria-label="Tipo de ingreso">
          <button type="button" className={isPortalMode ? 'active' : ''} onClick={() => setMode('portal')}>Portal pacientes</button>
          <button type="button" className={!isPortalMode ? 'active' : ''} onClick={() => setMode('admin')}>Equipo veterinario</button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required autoComplete="current-password" />
          </label>
          {error && <div className="alert alert-danger">{error}</div>}
          <button className="btn btn-primary full" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {isLocalDemoMode && (
          <small className="muted">Demo local activo solo para desarrollo. En producción Firebase es obligatorio.</small>
        )}
        <small className="muted">Versión {APP_VERSION}</small>
      </section>
    </main>
  )
}
