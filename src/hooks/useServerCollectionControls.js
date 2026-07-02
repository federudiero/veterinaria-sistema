import { useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../config/performance.js'
import { useDebouncedValue } from './useDebouncedValue.js'
import { usePagedCollection } from './usePagedCollection.js'

export function buildDateWhere(dateField, dateFrom, dateTo) {
  const filters = []
  if (dateField && dateFrom) filters.push({ field: dateField, op: '>=', value: dateFrom })
  if (dateField && dateTo) filters.push({ field: dateField, op: '<=', value: dateTo })
  return filters
}

export function useServerCollectionControls(collectionName, {
  dateField = 'date',
  statusField = '',
  orderByField = dateField || 'updatedAt',
  orderDirection = 'desc',
  defaultPageSize = DEFAULT_PAGE_SIZE,
  extraWhere = [],
  initialDateFrom = '',
  initialDateTo = '',
  initialStatus = '',
} = {}) {
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [status, setStatus] = useState(initialStatus)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const debouncedQuery = useDebouncedValue(query, 300)

  const where = useMemo(() => [
    ...buildDateWhere(dateField, dateFrom, dateTo),
    ...(statusField && status ? [{ field: statusField, op: '==', value: status }] : []),
    ...extraWhere,
  ], [dateField, dateFrom, dateTo, statusField, status, extraWhere])

  const list = usePagedCollection(collectionName, {
    searchTerm: debouncedQuery,
    where,
    orderByField,
    orderDirection,
    limitCount: pageSize,
  })

  function clearFilters() {
    setQuery('')
    setDateFrom('')
    setDateTo('')
    setStatus('')
    list.reset?.()
  }

  return {
    ...list,
    query,
    setQuery,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    status,
    setStatus,
    pageSize,
    setPageSize,
    clearFilters,
    filteredItems: list.items,
    rows: list.items,
  }
}
