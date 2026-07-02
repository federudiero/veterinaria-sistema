import React from 'react'
import { PAGE_SIZE_OPTIONS } from '../../config/performance.js'

export function Pagination({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  total,
  rawTotal,
  limit,
  serverPaged = false,
  hasNextPage = false,
  hasPreviousPage = false,
  nextPage,
  previousPage,
}) {
  const canGoPrevious = serverPaged ? hasPreviousPage : page > 1
  const canGoNext = serverPaged ? hasNextPage : page < pageCount

  const goPrevious = () => {
    if (!canGoPrevious) return
    if (serverPaged && previousPage) previousPage()
    else onPageChange(page - 1)
  }

  const goNext = () => {
    if (!canGoNext) return
    if (serverPaged && nextPage) nextPage()
    else onPageChange(page + 1)
  }

  return (
    <div className="pagination-bar">
      <div className="pagination-info">
        <strong>{serverPaged ? total : total}</strong> registro{total === 1 ? '' : 's'} en esta vista
        {serverPaged ? <span> · paginación por servidor</span> : null}
        {!serverPaged && typeof rawTotal === 'number' && rawTotal !== total ? <span> · {rawTotal} cargados</span> : null}
        {limit ? <span> · lectura máx. {limit}</span> : null}
      </div>

      <div className="pagination-actions">
        <label className="page-size">
          <span>Filas</span>
          <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        {!serverPaged && <button className="btn btn-small" onClick={() => onPageChange(1)} disabled={page <= 1}>Primera</button>}
        <button className="btn btn-small" onClick={goPrevious} disabled={!canGoPrevious}>Anterior</button>
        <span className="page-current">Página {page}{serverPaged ? '' : ` / ${pageCount}`}</span>
        <button className="btn btn-small" onClick={goNext} disabled={!canGoNext}>Siguiente</button>
      </div>
    </div>
  )
}
