import React, { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export function Modal({
  title,
  children,
  footer,
  onClose,
  size = 'lg',
  closeOnBackdrop = false,
  className = '',
}) {
  const titleId = useId()
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const activeElement = document.activeElement
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`
    document.body.classList.add('modal-open')

    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const focusTimer = window.setTimeout(() => {
      const firstFocusable = dialogRef.current?.querySelector(focusableSelector)
      firstFocusable?.focus?.({ preventScroll: true })
    }, 60)

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current?.()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(dialogRef.current.querySelectorAll(focusableSelector))
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleKeyDown)
      activeElement?.focus?.({ preventScroll: true })
    }
  }, [])

  function handleBackdropMouseDown(event) {
    if (!closeOnBackdrop) return
    if (event.target === event.currentTarget) onCloseRef.current?.()
  }

  const node = (
    <div className="modal-layer" role="presentation">
      <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropMouseDown}>
        <section
          ref={dialogRef}
          className={[`modal modal-${size}`, className].filter(Boolean).join(' ')}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <header className="modal-header">
            <div className="modal-header-copy">
              <span className="modal-kicker">Formulario</span>
              <h2 id={titleId}>{title}</h2>
            </div>
            <button className="icon-btn modal-close" type="button" onClick={() => onCloseRef.current?.()} aria-label="Cerrar modal">
              ×
            </button>
          </header>
          <div className="modal-body">{children}</div>
          {footer && <footer className="modal-footer">{footer}</footer>}
        </section>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
