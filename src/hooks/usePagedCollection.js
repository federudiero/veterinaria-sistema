import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_PAGE_SIZE } from '../config/performance.js'
import { repository } from '../services/repositories/repositoryFactory.js'

function stableOptions(options) {
  return JSON.stringify(options || {})
}

export function usePagedCollection(collectionName, options = {}) {
  const requestedPageSize = Number(options.limitCount || DEFAULT_PAGE_SIZE)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(requestedPageSize)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const cursorsRef = useRef([null])
  const optionsKey = stableOptions({ ...options, limitCount: undefined })

  const reset = useCallback(() => {
    cursorsRef.current = [null]
    setPage(1)
  }, [])

  useEffect(() => {
    reset()
  }, [optionsKey, pageSize, reset])

  useEffect(() => {
    if (Number.isFinite(requestedPageSize) && requestedPageSize !== pageSize) {
      setPageSize(requestedPageSize)
    }
  }, [pageSize, requestedPageSize])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const parsedOptions = JSON.parse(optionsKey)
        const cursor = cursorsRef.current[page - 1] || null
        const result = await repository.fetchCollectionPage(collectionName, {
          ...parsedOptions,
          limitCount: pageSize,
          startAfterDoc: cursor,
        })
        if (cancelled) return
        setItems(Array.isArray(result.rows) ? result.rows : [])
        setHasNextPage(Boolean(result.hasMore))
        if (result.lastDoc && !cursorsRef.current[page]) {
          cursorsRef.current[page] = result.lastDoc
        }
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'No se pudo leer la colección')
        setItems([])
        setHasNextPage(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [collectionName, optionsKey, page, pageSize, refreshToken])

  const api = useMemo(
    () => ({
      create: (payload) => repository.createDocument(collectionName, payload),
      fetchAllForExport: () => {
        const exportOptions = JSON.parse(optionsKey)
        delete exportOptions.limitCount
        delete exportOptions.startAfterDoc
        return repository.fetchCollectionForExport(collectionName, exportOptions)
      },
      set: (id, payload) => repository.setDocument(collectionName, id, payload),
      update: (id, payload) => repository.updateDocument(collectionName, id, payload),
      remove: (id) => repository.deleteDocument(collectionName, id),
      refresh: () => setRefreshToken((value) => value + 1),
      reset,
      page,
      setPage,
      nextPage: () => setPage((current) => (hasNextPage ? current + 1 : current)),
      previousPage: () => setPage((current) => Math.max(1, current - 1)),
      pageSize,
      setPageSize,
      pageCount: hasNextPage ? page + 1 : page,
      hasNextPage,
      hasPreviousPage: page > 1,
      total: items.length,
      rawTotal: items.length,
      serverPaged: true,
    }),
    [collectionName, hasNextPage, items.length, optionsKey, page, pageSize, reset],
  )

  return { items, loading, error, ...api }
}
