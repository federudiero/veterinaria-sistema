import React, { useMemo, useState } from 'react'

function optionLabel(option) {
  if (!option) return ''
  return typeof option === 'string' ? option : option.label
}

export function ListToolbar({
  query,
  onQueryChange,
  placeholder = 'Buscar por nombre, teléfono, DNI, código...',
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  status,
  onStatusChange,
  statusOptions = [],
  onClearFilters,
  children,
  extraActive = false,
}) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const hasDateFilters = typeof onDateFromChange === 'function' || typeof onDateToChange === 'function'
  const hasStatusFilter = typeof onStatusChange === 'function' && statusOptions.length > 0
  const hasAdvancedFilters = hasDateFilters || hasStatusFilter || Boolean(children)
  const canClear = Boolean(query || dateFrom || dateTo || status || extraActive)
  const statusLabel = useMemo(() => {
    const selected = statusOptions.find((option) => String(typeof option === 'string' ? option : option.value) === String(status || ''))
    return optionLabel(selected)
  }, [status, statusOptions])

  return (
    <div className="list-toolbar">
      <div className="toolbar-search-row">
        <input
          className="search-input search-input-wide"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
        />
        {hasAdvancedFilters && (
          <button
            className={`btn btn-small toolbar-filter-toggle${filtersOpen ? ' active' : ''}`}
            type="button"
            onClick={() => setFiltersOpen((value) => !value)}
            aria-expanded={filtersOpen}
          >
            Filtros
          </button>
        )}
      </div>

      {canClear && (
        <div className="toolbar-active-chips" aria-label="Filtros activos">
          {query && <span>Texto: {query}</span>}
          {dateFrom && <span>Desde: {dateFrom}</span>}
          {dateTo && <span>Hasta: {dateTo}</span>}
          {status && <span>Estado: {statusLabel || status}</span>}
          {extraActive && <span>Etiqueta activa</span>}
          {onClearFilters && <button className="btn btn-small btn-ghost" type="button" onClick={onClearFilters}>Limpiar</button>}
        </div>
      )}

      {hasAdvancedFilters && (
        <div className={`toolbar-advanced-filters${filtersOpen ? ' is-open' : ''}`}>
          {hasDateFilters && (
            <div className="toolbar-filter-group">
              <label>
                <span>Desde</span>
                <input type="date" value={dateFrom || ''} onChange={(event) => onDateFromChange?.(event.target.value)} />
              </label>
              <label>
                <span>Hasta</span>
                <input type="date" value={dateTo || ''} onChange={(event) => onDateToChange?.(event.target.value)} />
              </label>
            </div>
          )}

          {hasStatusFilter && (
            <label className="toolbar-status-filter">
              <span>Estado</span>
              <select value={status || ''} onChange={(event) => onStatusChange(event.target.value)}>
                <option value="">Todos</option>
                {statusOptions.map((option) => (
                  <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>
                    {typeof option === 'string' ? option : option.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {children && <div className="toolbar-extra-filters">{children}</div>}
        </div>
      )}
    </div>
  )
}
