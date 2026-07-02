import React from 'react'
import { APP_VERSION, SUPPORT_EMAIL } from '../../config/runtime.js'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('[Sistema Veterinaria] Error no controlado:', error, errorInfo)
  }

  reload() {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="system-screen">
        <section className="system-card system-card-danger">
          <div className="system-icon">!</div>
          <p className="eyebrow">Error de aplicación</p>
          <h1>El sistema encontró un problema inesperado</h1>
          <p>
            No se perdieron cambios confirmados. Recargá la pantalla. Si vuelve a pasar,
            copiá el detalle técnico y revisá consola/build antes de continuar usando producción.
          </p>
          <div className="system-actions">
            <button className="btn btn-primary" onClick={this.reload}>Recargar sistema</button>
            {SUPPORT_EMAIL && <a className="btn" href={`mailto:${SUPPORT_EMAIL}`}>Contactar soporte</a>}
          </div>
          <details className="technical-details">
            <summary>Detalle técnico</summary>
            <pre>{String(this.state.error?.message || this.state.error)}</pre>
            {this.state.errorInfo?.componentStack && <pre>{this.state.errorInfo.componentStack}</pre>}
          </details>
          <small className="muted">Versión {APP_VERSION}</small>
        </section>
      </main>
    )
  }
}
