import React from 'react'
export function StatCard({ label, value, help, tone = 'default' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {help && <small>{help}</small>}
    </article>
  )
}
