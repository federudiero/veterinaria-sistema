import React from 'react'

export function TagFilter({ value = '', options = [], onChange }) {
  if (!options.length) return null
  return (
    <label className="toolbar-status-filter tag-filter-control">
      <span>Etiqueta</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}
