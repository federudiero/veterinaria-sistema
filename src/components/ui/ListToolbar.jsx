import React from 'react'

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
}) {
  const hasDateFilters = typeof onDateFromChange === 'function' || typeof onDateToChange === 'function'
  const hasStatusFilter = typeof onStatusChange === 'function' && statusOptions.length > 0
  const canClear = Boolean(query || dateFrom || dateTo || status)

  return (
    <div className="list-toolbar">
      <input
        className="search-input search-input-wide"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
      />

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

      {onClearFilters && canClear && <button className="btn btn-small" type="button" onClick={onClearFilters}>Limpiar</button>}
      {children}
    </div>
  )
}
