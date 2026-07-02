import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

const FeedbackContext = createContext(null)

const TONE_LABELS = {
  success: 'Listo',
  error: 'Error',
  warning: 'Atención',
  info: 'Información',
  danger: 'Confirmar acción',
}

function makeToastId() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmState, setConfirmState] = useState(null)
  const confirmResolver = useRef(null)

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(({ type = 'info', title, message, timeout = 3800 }) => {
    const id = makeToastId()
    const toast = {
      id,
      type,
      title: title || TONE_LABELS[type] || TONE_LABELS.info,
      message,
    }
    setToasts((current) => [toast, ...current].slice(0, 4))
    if (timeout > 0) window.setTimeout(() => dismissToast(id), timeout)
    return id
  }, [dismissToast])

  const success = useCallback((message, title = 'Listo') => notify({ type: 'success', title, message }), [notify])
  const error = useCallback((message, title = 'Error') => notify({ type: 'error', title, message, timeout: 5200 }), [notify])
  const warning = useCallback((message, title = 'Atención') => notify({ type: 'warning', title, message, timeout: 4600 }), [notify])
  const info = useCallback((message, title = 'Información') => notify({ type: 'info', title, message }), [notify])

  const confirm = useCallback((options = {}) => {
    setConfirmState({
      title: options.title || 'Confirmar acción',
      message: options.message || '¿Querés continuar?',
      confirmText: options.confirmText || 'Confirmar',
      cancelText: options.cancelText || 'Cancelar',
      tone: options.tone || 'danger',
    })
    return new Promise((resolve) => {
      confirmResolver.current = resolve
    })
  }, [])

  const closeConfirm = useCallback((value) => {
    setConfirmState(null)
    confirmResolver.current?.(value)
    confirmResolver.current = null
  }, [])

  const value = useMemo(() => ({ notify, success, error, warning, info, confirm }), [confirm, error, info, notify, success, warning])

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-label="Alertas del sistema">
        {toasts.map((toast) => (
          <article key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon" aria-hidden="true">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '!' : toast.type === 'warning' ? '!' : 'i'}
            </div>
            <div>
              <strong>{toast.title}</strong>
              {toast.message && <p>{toast.message}</p>}
            </div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Cerrar alerta">×</button>
          </article>
        ))}
      </div>

      {confirmState && (
        <div className="modal-backdrop confirm-backdrop" role="presentation" onMouseDown={() => closeConfirm(false)}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className={`confirm-icon confirm-${confirmState.tone}`}>{confirmState.tone === 'danger' ? '!' : '?'}</div>
            <div>
              <h2>{confirmState.title}</h2>
              <p>{confirmState.message}</p>
            </div>
            <footer className="confirm-actions">
              <button className="btn" onClick={() => closeConfirm(false)}>{confirmState.cancelText}</button>
              <button className={`btn ${confirmState.tone === 'danger' ? 'btn-danger-solid' : 'btn-primary'}`} onClick={() => closeConfirm(true)}>
                {confirmState.confirmText}
              </button>
            </footer>
          </section>
        </div>
      )}
    </FeedbackContext.Provider>
  )
}

export function useFeedback() {
  const context = useContext(FeedbackContext)
  if (!context) throw new Error('useFeedback debe usarse dentro de FeedbackProvider')
  return context
}
