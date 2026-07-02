import React, { useMemo, useState } from 'react'
import { normalizeSearchText } from '../../utils/search.js'

function optionValue(option) {
  return option.value ?? option
}

function optionLabel(option) {
  return option.label ?? option
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar',
  searchPlaceholder = 'Buscar opción...',
  disabled = false,
  maxVisibleOptions = 80,
}) {
  const [query, setQuery] = useState('')
  const selectedOption = options.find((option) => String(optionValue(option)) === String(value ?? ''))

  const visibleOptions = useMemo(() => {
    const term = normalizeSearchText(query)
    const filtered = term
      ? options.filter((option) => normalizeSearchText(optionLabel(option)).includes(term))
      : options
    const limited = filtered.slice(0, maxVisibleOptions)
    if (selectedOption && !limited.some((option) => String(optionValue(option)) === String(optionValue(selectedOption)))) {
      return [selectedOption, ...limited]
    }
    return limited
  }, [maxVisibleOptions, options, query, selectedOption])

  return (
    <label className="field searchable-select-field">
      <span>{label}</span>
      {options.length > 12 && (
        <input
          className="select-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          disabled={disabled}
        />
      )}
      <select value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {visibleOptions.map((option) => (
          <option key={optionValue(option)} value={optionValue(option)}>
            {optionLabel(option)}
          </option>
        ))}
      </select>
      {options.length > visibleOptions.length && (
        <small className="field-hint">Mostrando {visibleOptions.length} de {options.length}. Escribí para filtrar.</small>
      )}
    </label>
  )
}
