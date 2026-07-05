import React from 'react'
import { normalizeTagIds } from '../../data/tagScopes.js'

export function TagSelector({ value = [], options = [], onChange, disabled = false }) {
  const selected = normalizeTagIds(value)

  function toggle(id) {
    if (disabled) return
    const next = selected.includes(id)
      ? selected.filter((item) => item !== id)
      : [...selected, id]
    onChange(next)
  }

  if (!options.length) {
    return <div className="tag-selector-empty">No hay etiquetas configuradas para esta sección.</div>
  }

  return (
    <div className="tag-selector" role="group" aria-label="Etiquetas">
      {options.map((option) => {
        const active = selected.includes(String(option.value))
        return (
          <button
            key={option.value}
            type="button"
            className={`tag-choice tag-${option.color || 'teal'}${active ? ' active' : ''}`}
            onClick={() => toggle(String(option.value))}
            disabled={disabled}
          >
            <span>{active ? '✓' : '+'}</span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
