import React, { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { isFirebaseMode, isLocalDemoMode } from '../../services/repositories/repositoryFactory.js'
import { APP_VERSION } from '../../config/runtime.js'

export function LoginPage() {
  const { user, login, error } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState(isLocalDemoMode ? 'admin@vetgest.local' : '')
  const [password, setPassword] = useState(isLocalDemoMode ? '123456' : '')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />

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
            <strong>Sistema Veterinaria</strong>
            <small>{isFirebaseMode ? 'Ingreso seguro con Firebase Auth' : 'Demo local sin Firebase'}</small>
          </div>
        </div>

        <h1>Sistema veterinario completo</h1>
        <p>Gestión clínica, comercial, stock, caja, internación, mutualismo y reportes.</p>

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
