import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { TagBadge } from '../../components/tags/TagBadge.jsx'
import { TAG_COLOR_OPTIONS, TAG_SCOPE_LABELS, TAG_SCOPE_OPTIONS } from '../../data/tagScopes.js'

export function TagsPage() {
  return (
    <CrudPage
      collectionName="tags"
      eyebrow="Configuración"
      title="Etiquetas"
      description="Clasificadores controlados por sección. Sirven para filtrar, identificar y exportar registros sin depender solo del buscador. Si una etiqueta ya no se usa, desactivala en lugar de borrarla."
      createLabel="Nueva etiqueta"
      searchFields={['name', 'color', 'scopes', 'notes']}
      searchPlaceholder="Buscar etiqueta por nombre, color, sección o nota..."
      allowDelete={false}
      enableStatusFilter={false}
      enableDateFilters={false}
      defaultOrderByField="name"
      defaultOrderDirection="asc"
      initialValues={{ name: '', color: 'teal', scopes: [], active: true, notes: '' }}
      fields={[
        { name: 'name', label: 'Nombre', required: true, placeholder: 'Ej: VIP, Crónico, Urgente, Moroso...' },
        { name: 'color', label: 'Color', type: 'select', options: TAG_COLOR_OPTIONS },
        { name: 'scopes', label: 'Aplicar en secciones', type: 'permissionsChecklist', options: TAG_SCOPE_OPTIONS, required: true },
        { name: 'active', label: 'Etiqueta activa', type: 'checkbox' },
        { name: 'notes', label: 'Notas internas', type: 'textarea', rows: 3 },
      ]}
      columns={[
        { key: 'name', label: 'Etiqueta', render: (row) => <TagBadge tag={row} /> },
        { key: 'scopes', label: 'Secciones', render: (row) => (Array.isArray(row.scopes) ? row.scopes : []).map((scope) => TAG_SCOPE_LABELS[scope] || scope).join(', ') || '-' },
        { key: 'active', label: 'Estado', render: (row) => row.active === false ? 'Inactiva' : 'Activa' },
        { key: 'notes', label: 'Notas' },
      ]}
      exportColumns={[
        { key: 'name', label: 'Etiqueta' },
        { key: 'color', label: 'Color' },
        { key: 'scopes', label: 'Secciones', exportValue: (row) => (Array.isArray(row.scopes) ? row.scopes : []).map((scope) => TAG_SCOPE_LABELS[scope] || scope).join(', ') || '-' },
        { key: 'active', label: 'Estado', exportValue: (row) => row.active === false ? 'Inactiva' : 'Activa' },
        { key: 'notes', label: 'Notas' },
      ]}
    />
  )
}
