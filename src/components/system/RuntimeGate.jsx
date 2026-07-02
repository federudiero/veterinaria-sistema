import React from 'react'
import { APP_ENV, APP_VERSION, REQUIRE_FIREBASE, SUPPORT_EMAIL } from '../../config/runtime.js'
import {
  TENANT_ID,
  USE_EMULATORS,
  USE_FIREBASE,
  firebaseStartupError,
  hasFirebaseConfig,
  missingFirebaseConfigKeys,
} from '../../services/firebase/config.js'

export function RuntimeGate({ children }) {
  if (!firebaseStartupError) return children

  return (
    <main className="system-screen">
      <section className="system-card system-card-warning">
        <div className="system-icon">!</div>
        <p className="eyebrow">Configuración incompleta</p>
        <h1>Firebase es obligatorio para producción</h1>
        <p>
          El sistema bloqueó el arranque para evitar guardar datos en modo local por error.
          Corregí el archivo <code>.env</code> y volvé a levantar la app.
        </p>

        <div className="runtime-grid">
          <div><span>Ambiente</span><strong>{APP_ENV}</strong></div>
          <div><span>Versión</span><strong>{APP_VERSION}</strong></div>
          <div><span>Tenant</span><strong>{TENANT_ID}</strong></div>
          <div><span>Firebase solicitado</span><strong>{USE_FIREBASE ? 'Sí' : 'No'}</strong></div>
          <div><span>Firebase config</span><strong>{hasFirebaseConfig ? 'Completa' : 'Incompleta'}</strong></div>
          <div><span>Emuladores</span><strong>{USE_EMULATORS ? 'Activos' : 'Inactivos'}</strong></div>
          <div><span>Firebase requerido</span><strong>{REQUIRE_FIREBASE ? 'Sí' : 'No'}</strong></div>
        </div>

        <div className="alert alert-danger">
          {firebaseStartupError}
        </div>

        {missingFirebaseConfigKeys.length > 0 && (
          <details className="technical-details" open>
            <summary>Variables faltantes</summary>
            <ul>
              {missingFirebaseConfigKeys.map((key) => <li key={key}>VITE_FIREBASE_{key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}</li>)}
            </ul>
          </details>
        )}

        <div className="system-actions">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reintentar</button>
          {SUPPORT_EMAIL && <a className="btn" href={`mailto:${SUPPORT_EMAIL}`}>Contactar soporte</a>}
        </div>
      </section>
    </main>
  )
}
