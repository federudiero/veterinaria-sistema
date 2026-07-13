import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { normalizeSearchText } from '../../utils/search.js'

function optionValue(option) {
  return option.value ?? option
}

function optionLabel(option) {
  return option.label ?? option
}

function optionKeywords(option) {
  if (!option || typeof option !== 'object') return ''
  return option.keywords || option.searchText || option.description || ''
}

function optionSearchText(option) {
  return normalizeSearchText(`${optionLabel(option)} ${optionKeywords(option)}`)
}

function safeAutocompleteName(name, fallbackId) {
  const base = String(name || fallbackId || 'lookup').replace(/[^a-zA-Z0-9_-]/g, '_')
  const suffix = String(fallbackId || 'field').replace(/[^a-zA-Z0-9_-]/g, '_')
  return `lookup_${base}_${suffix}`
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar',
  searchPlaceholder = 'Buscar opción...',
  disabled = false,
  required = false,
  name,
  id,
  maxVisibleOptions = 20,
  minSearchChars = 2,
}) {
  const generatedId = useId()
  const inputId = id || name || generatedId
  const safeInputName = safeAutocompleteName(name, generatedId)
  const listboxId = `${inputId}-listbox`
  const optionDomId = (index) => `${listboxId}-option-${index}`
  const inputRef = useRef(null)
  const blurTimerRef = useRef(null)
  const selectedOption = options.find((option) => String(optionValue(option)) === String(value ?? ''))
  const selectedLabel = selectedOption ? optionLabel(selectedOption) : ''
  const [inputValue, setInputValue] = useState(selectedLabel)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const needsRequiredSelection = Boolean(required && !disabled && !value)

  useEffect(() => {
    setInputValue(selectedLabel)
  }, [selectedLabel, value])

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current)
    }
  }, [])

  const normalizedInput = normalizeSearchText(inputValue)
  const normalizedSelectedLabel = normalizeSearchText(selectedLabel)
  const hasEnoughSearch = normalizedInput.length >= minSearchChars && normalizedInput !== normalizedSelectedLabel

  const visibleOptions = useMemo(() => {
    if (!hasEnoughSearch) return []
    return options
      .filter((option) => optionSearchText(option).includes(normalizedInput))
      .slice(0, maxVisibleOptions)
  }, [hasEnoughSearch, maxVisibleOptions, normalizedInput, options])

  useEffect(() => {
    setActiveIndex(0)
  }, [inputValue, open])

  function clearNativeValidation() {
    inputRef.current?.setCustomValidity?.('')
  }

  function commitSelection(option) {
    const nextValue = optionValue(option)
    setInputValue(optionLabel(option))
    setOpen(false)
    onChange(String(nextValue))
    window.requestAnimationFrame(() => {
      clearNativeValidation()
      inputRef.current?.focus()
    })
  }

  function clearSelection(event) {
    event.preventDefault()
    event.stopPropagation()
    setInputValue('')
    setOpen(false)
    onChange('')
    window.requestAnimationFrame(() => {
      clearNativeValidation()
      inputRef.current?.focus()
    })
  }

  function handleFocus(event) {
    if (disabled) return
    if (blurTimerRef.current) window.clearTimeout(blurTimerRef.current)
    setOpen(true)
    event.target.select?.()
  }

  function handleBlur() {
    blurTimerRef.current = window.setTimeout(() => {
      setOpen(false)
      setInputValue(selectedLabel)
    }, 140)
  }

  function handleInvalid(event) {
    if (!value) event.currentTarget.setCustomValidity('Seleccioná una opción de la lista.')
  }

  function handleInputChange(event) {
    event.currentTarget.setCustomValidity('')
    setInputValue(event.target.value)
    setOpen(true)
  }

  function handleKeyDown(event) {
    if (disabled) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.min(index + 1, Math.max(visibleOptions.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      if (open && visibleOptions[activeIndex]) {
        event.preventDefault()
        commitSelection(visibleOptions[activeIndex])
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setInputValue(selectedLabel)
    }
  }

  const control = (
    <>
      <div className={`combobox-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
        <input
          ref={inputRef}
          id={inputId}
          name={safeInputName}
          className="combobox-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInvalid={handleInvalid}
          placeholder={selectedOption ? placeholder : searchPlaceholder}
          disabled={disabled}
          required={needsRequiredSelection}
          pattern={needsRequiredSelection ? '__seleccionar_opcion_valida__' : undefined}
          title={needsRequiredSelection ? 'Seleccioná una opción de la lista.' : undefined}
          autoComplete="new-password"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          data-form-type="other"
          data-lpignore="true"
          data-1p-ignore="true"
          data-bwignore="true"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && visibleOptions[activeIndex] ? optionDomId(activeIndex) : undefined}
        />
        {value && !disabled && (
          <button className="combobox-clear" type="button" onMouseDown={clearSelection} aria-label="Limpiar selección">
            ×
          </button>
        )}
        <span className="combobox-caret" aria-hidden="true">⌄</span>

        {open && !disabled && (
          <div className="combobox-menu" id={listboxId} role="listbox">
            {!hasEnoughSearch ? (
              <div className="combobox-empty">Escribí al menos {minSearchChars} caracteres para buscar.</div>
            ) : visibleOptions.length > 0 ? (
              visibleOptions.map((option, index) => {
                const currentValue = optionValue(option)
                const selected = String(currentValue) === String(value ?? '')
                const active = index === activeIndex
                return (
                  <button
                    key={currentValue}
                    id={optionDomId(index)}
                    className={`combobox-option${selected ? ' is-selected' : ''}${active ? ' is-active' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      commitSelection(option)
                    }}
                  >
                    <span>{optionLabel(option)}</span>
                    {selected && <strong>Seleccionado</strong>}
                  </button>
                )
              })
            ) : (
              <div className="combobox-empty">Sin coincidencias.</div>
            )}
            {hasEnoughSearch && options.length > visibleOptions.length && (
              <div className="combobox-footer">Mostrando {visibleOptions.length} de {options.length}. Seguí escribiendo para afinar.</div>
            )}
          </div>
        )}
      </div>
    </>
  )

  if (!label) return control

  return (
    <label className="field searchable-select-field">
      <span>{label}</span>
      {control}
    </label>
  )
}
