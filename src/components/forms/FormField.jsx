import React, { useMemo, useState } from 'react'
import { normalizeSearchText } from '../../utils/search.js'
import { TagSelector } from '../tags/TagSelector.jsx'

function optionValue(option) {
  return option.value ?? option
}

function optionLabel(option) {
  return option.label ?? option
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function FormField({ field, value, form = {}, onChange }) {
  const [optionFilter, setOptionFilter] = useState('')
  const options = field.options || []
  const fieldContext = { field, value, form }
  const selectedOption = options.find((option) => String(optionValue(option)) === String(value ?? ''))
  const resolvedHint = typeof field.hint === 'function' ? field.hint(fieldContext) : field.hint
  const resolvedDisabled = typeof field.disabled === 'function' ? field.disabled(fieldContext) : field.disabled
  const resolvedReadOnly = typeof field.readOnly === 'function' ? field.readOnly(fieldContext) : field.readOnly

  const visibleOptions = useMemo(() => {
    if (field.type !== 'select') return options
    const term = normalizeSearchText(optionFilter)
    const filtered = term
      ? options.filter((option) => normalizeSearchText(optionLabel(option)).includes(term))
      : options
    const limited = filtered.slice(0, field.maxVisibleOptions || 60)
    if (selectedOption && !limited.some((option) => String(optionValue(option)) === String(optionValue(selectedOption)))) {
      return [selectedOption, ...limited]
    }
    return limited
  }, [field.type, field.maxVisibleOptions, optionFilter, options, selectedOption])

  const commonProps = {
    id: field.name,
    name: field.name,
    value: field.type === 'checkbox' || field.type === 'permissionsChecklist' || field.type === 'tagPicker' ? undefined : value ?? '',
    checked: field.type === 'checkbox' ? Boolean(value) : undefined,
    required: field.required,
    placeholder: field.placeholder || '',
    readOnly: resolvedReadOnly,
    disabled: resolvedDisabled,
    min: field.min,
    max: field.max,
    step: field.step,
    inputMode: field.inputMode,
    onChange: (event) => {
      const nextValue = field.type === 'checkbox' ? event.target.checked : event.target.value
      onChange(field.name, nextValue, field)
    },
  }

  const selectedPermissions = normalizeArray(value)
  const groupedOptions = useMemo(() => {
    return options.reduce((acc, option) => {
      const group = option.group || 'Permisos'
      if (!acc[group]) acc[group] = []
      acc[group].push(option)
      return acc
    }, {})
  }, [options])

  function togglePermission(permission) {
    if (resolvedDisabled) return
    const exists = selectedPermissions.includes(permission)
    const next = exists
      ? selectedPermissions.filter((item) => item !== permission)
      : [...selectedPermissions, permission]
    onChange(field.name, next, field)
  }

  return (
    <label className={`field field-${field.type || 'text'}`}>
      <span>{field.label}</span>
      {field.type === 'textarea' || field.type === 'permissions' ? (
        <textarea {...commonProps} rows={field.rows || 3} />
      ) : field.type === 'tagPicker' ? (
        <TagSelector
          value={value}
          options={options}
          disabled={resolvedDisabled}
          onChange={(next) => onChange(field.name, next, field)}
        />
      ) : field.type === 'permissionsChecklist' ? (
        <div className="permissions-grid" role="group" aria-label={field.label}>
          {Object.entries(groupedOptions).map(([group, groupOptions]) => (
            <section className="permission-group" key={group}>
              <strong>{group}</strong>
              {groupOptions.map((option) => {
                const valueOption = optionValue(option)
                return (
                  <button
                    key={valueOption}
                    type="button"
                    className={`permission-chip ${selectedPermissions.includes(valueOption) ? 'active' : ''}`}
                    onClick={() => togglePermission(valueOption)}
                    disabled={resolvedDisabled}
                  >
                    <span className="permission-check">{selectedPermissions.includes(valueOption) ? '✓' : '+'}</span>
                    {optionLabel(option)}
                  </button>
                )
              })}
            </section>
          ))}
        </div>
      ) : field.type === 'select' ? (
        <>
          {options.length > 12 && (
            <input
              className="select-filter"
              value={optionFilter}
              onChange={(event) => setOptionFilter(event.target.value)}
              placeholder="Buscar opción..."
            />
          )}
          <select {...commonProps}>
            <option value="">Seleccionar</option>
            {visibleOptions.map((option) => (
              <option key={optionValue(option)} value={optionValue(option)}>
                {optionLabel(option)}
              </option>
            ))}
          </select>
          {options.length > visibleOptions.length && (
            <small className="field-hint">Mostrando {visibleOptions.length} de {options.length}. Escribí para filtrar.</small>
          )}
        </>
      ) : field.type === 'checkbox' ? (
        <input {...commonProps} type="checkbox" />
      ) : (
        <input {...commonProps} type={field.type || 'text'} />
      )}
      {resolvedHint && <small className="field-hint">{resolvedHint}</small>}
    </label>
  )
}
