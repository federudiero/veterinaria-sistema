import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../config/performance.js'
import { matchesSearch } from '../utils/search.js'

export function useDataControls(items, { searchFields = [], defaultPageSize = DEFAULT_PAGE_SIZE } = {}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const filtered = useMemo(() => {
    if (!query.trim()) return items
    return items.filter((item) => matchesSearch(item, query, searchFields))
  }, [items, query, searchFields])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const start = (safePage - 1) * pageSize
  const rows = filtered.slice(start, start + pageSize)

  useEffect(() => {
    setPage(1)
  }, [query, pageSize])

  return {
    query,
    setQuery,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    rows,
    filteredItems: filtered,
    total: filtered.length,
    rawTotal: items.length,
  }
}
