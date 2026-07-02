import { useEffect, useMemo, useState, useCallback } from 'react'
import { repository } from '../services/repositories/repositoryFactory.js'

function stableOptions(options) {
  return JSON.stringify(options || {})
}

export function useCollection(collectionName, options = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const optionsKey = stableOptions(options)

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const parsedOptions = JSON.parse(optionsKey)
        const result = await repository.fetchCollectionPage(collectionName, parsedOptions)
        if (cancelled) return
        setItems(Array.isArray(result?.rows) ? result.rows : [])
      } catch (err) {
        if (cancelled) return
        setError(err?.message || 'No se pudo leer la colección')
        setItems([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [collectionName, optionsKey, refreshToken])

  const api = useMemo(
    () => ({
      fetchAllForExport: () => {
        const exportOptions = JSON.parse(optionsKey)
        delete exportOptions.limitCount
        delete exportOptions.startAfterDoc
        return repository.fetchCollectionForExport(collectionName, exportOptions)
      },
      create: async (payload) => {
        const id = await repository.createDocument(collectionName, payload)
        refresh()
        return id
      },
      set: async (id, payload) => {
        const result = await repository.setDocument(collectionName, id, payload)
        refresh()
        return result
      },
      update: async (id, payload) => {
        const result = await repository.updateDocument(collectionName, id, payload)
        refresh()
        return result
      },
      remove: async (id) => {
        const result = await repository.deleteDocument(collectionName, id)
        refresh()
        return result
      },
      refresh,
    }),
    [collectionName, optionsKey, refresh],
  )

  return { items, loading, error, ...api }
}
