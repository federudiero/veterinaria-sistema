import React from 'react'
export function StatusBadge({ children, tone = 'default' }) {
  return <span className={`badge tone-${tone}`}>{children}</span>
}
