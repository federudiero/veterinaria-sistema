import { useEffect, useState } from 'react'
import { repository } from '../services/repositories/repositoryFactory.js'

function stableOptions(options) {
  return JSON.stringify(options || {})
}

export function useCollectionCount(collectionName, options = {}) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const optionsKey = stableOptions(options)

  useEffect(() => {
    let cancelled = false
    async function loadCount() {
      setLoading(true)
      setError('')
      try {
        const parsedOptions = JSON.parse(optionsKey)
        const nextCount = await repository.getCollectionCount(collectionName, parsedOptions)
        if (!cancelled) setCount(nextCount)
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'No se pudo calcular el total')
          setCount(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadCount()
    return () => {
      cancelled = true
    }
  }, [collectionName, optionsKey])

  return { count, loading, error }
}
