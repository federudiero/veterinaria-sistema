import React from 'react'
import { normalizeTagIds } from '../../data/tagScopes.js'

export function TagBadge({ tag }) {
  if (!tag) return null
  return <span className={`tag-badge tag-${tag.color || 'teal'}`}>{tag.name || tag.label}</span>
}

export function TagList({ tagIds = [], tags = [], empty = '-' }) {
  const ids = normalizeTagIds(tagIds)
  if (!ids.length) return <span className="muted">{empty}</span>
  const tagMap = Object.fromEntries(tags.map((tag) => [tag.id, tag]))
  const selected = ids.map((id) => tagMap[id]).filter(Boolean)
  if (!selected.length) return <span className="muted">{empty}</span>
  return (
    <span className="tag-list">
      {selected.map((tag) => <TagBadge key={tag.id} tag={tag} />)}
    </span>
  )
}
