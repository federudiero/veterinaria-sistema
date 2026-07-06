import React, { useEffect, useId, useMemo, useState } from 'react'
import { SectionHeader } from '../../components/ui/SectionHeader.jsx'
import { DataTable } from '../../components/ui/DataTable.jsx'
import { Modal } from '../../components/ui/Modal.jsx'
import { Pagination } from '../../components/ui/Pagination.jsx'
import { ListToolbar } from '../../components/ui/ListToolbar.jsx'
import { ExportButtons } from '../../components/export/ExportButtons.jsx'
import { IndividualExportActions } from '../../components/export/IndividualExportActions.jsx'
import { FormGrid } from '../../components/forms/FormGrid.jsx'
import { usePagedCollection } from '../../hooks/usePagedCollection.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { DEFAULT_PAGE_SIZE } from '../../config/performance.js'
import { buildSearchPayload } from '../../utils/search.js'
import { useFeedback } from '../../contexts/FeedbackContext.jsx'
import { useAuth } from '../../contexts/AuthContext.jsx'
import { COLLECTION_PERMISSIONS } from '../../data/modulePermissions.js'
import { useCollection } from '../../hooks/useCollection.js'
import { TagFilter } from '../../components/tags/TagFilter.jsx'
import { TagList } from '../../components/tags/TagBadge.jsx'
import { normalizeTagIds, tagNamesFromIds, tagOptionsForScope, tagsForScope } from '../../data/tagScopes.js'

function normalizePayload(payload, fields) {
  const next = { ...payload }
  fields.forEach((field) => {
    if (field.type === 'number') next[field.name] = Number(next[field.name] || 0)
    if (field.type === 'checkbox') next[field.name] = Boolean(next[field.name])
    if (field.type === 'tagPicker') next[field.name] = normalizeTagIds(next[field.name])
    if (field.type === 'permissions' || field.type === 'permissionsChecklist') {
      next[field.name] = String(next[field.name] || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  })
  return next
}

function stringifyPayload(payload) {
  const next = { ...payload }
  Object.keys(next).forEach((key) => {
    if (Array.isArray(next[key])) next[key] = next[key].join(', ')
  })
  return next
}

function optionValuesFromField(fields, fieldName) {
  const field = fields.find((item) => item.name === fieldName)
  return Array.isArray(field?.options) ? field.options : []
}

function buildWhereFilters({ dateField, dateFrom, dateTo, statusField, statusFilter }) {
  const filters = []
  if (dateField && dateFrom) filters.push({ field: dateField, op: '>=', value: dateFrom })
  if (dateField && dateTo) filters.push({ field: dateField, op: '<=', value: dateTo })
  if (statusField && statusFilter) filters.push({ field: statusField, op: '==', value: statusFilter })
  return filters
}

export function CrudPage({
  collectionName,
  title,
  eyebrow,
  description,
  fields,
  columns,
  searchFields = [],
  emptyState,
  createLabel = 'Nuevo registro',
  initialValues = {},
  beforeSave,
  afterSave,
  extraHeaderActions,
  exportColumns,
  exportSummary,
  exportSubtitle,
  exportFileLabel,
  documentIdField,
  readPermission,
  writePermission,
  deletePermission,
  allowDelete = true,
  dateField,
  statusField = 'status',
  statusOptions,
  enableDateFilters,
  enableStatusFilter,
  defaultOrderByField,
  defaultOrderDirection = 'desc',
  searchPlaceholder,
  enableTags = false,
  tagScope,
  extraRowActions,
}) {
  const modulePermissions = COLLECTION_PERMISSIONS[collectionName] || {}
  const effectiveReadPermission = readPermission ?? modulePermissions.read
  const effectiveWritePermission = writePermission ?? modulePermissions.write
  const effectiveDeletePermission = deletePermission ?? modulePermissions.delete ?? effectiveWritePermission
  const { hasPermission } = useAuth()
  const canRead = hasPermission(effectiveReadPermission)
  const canWrite = hasPermission(effectiveWritePermission)
  const canDelete = allowDelete && hasPermission(effectiveDeletePermission)
  const resolvedTagScope = tagScope || collectionName
  const tagsCollection = useCollection('tags', { limitCount: 250, orderByField: 'name', orderDirection: 'asc' })
  const availableTags = useMemo(() => enableTags ? tagsForScope(tagsCollection.items, resolvedTagScope) : [], [enableTags, resolvedTagScope, tagsCollection.items])
  const tagOptions = useMemo(() => tagOptionsForScope(tagsCollection.items, resolvedTagScope), [resolvedTagScope, tagsCollection.items])
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const debouncedQuery = useDebouncedValue(query, 300)
  const detectedDateField = dateField || (fields.some((field) => field.name === 'date') ? 'date' : '')
  const detectedStatusField = statusField && fields.some((field) => field.name === statusField) ? statusField : ''
  const finalStatusOptions = statusOptions || optionValuesFromField(fields, detectedStatusField)
  const showDateFilters = enableDateFilters ?? Boolean(detectedDateField)
  const showStatusFilter = enableStatusFilter ?? Boolean(detectedStatusField && finalStatusOptions.length)
  const orderByField = defaultOrderByField || (showDateFilters ? detectedDateField : 'updatedAt')
  const orderDirection = defaultOrderDirection
  const whereFilters = useMemo(() => [
    ...buildWhereFilters({
      dateField: showDateFilters ? detectedDateField : '',
      dateFrom,
      dateTo,
      statusField: showStatusFilter ? detectedStatusField : '',
      statusFilter,
    }),
    ...(enableTags && tagFilter ? [{ field: 'tagIds', op: 'array-contains', value: tagFilter }] : []),
  ], [showDateFilters, detectedDateField, dateFrom, dateTo, showStatusFilter, detectedStatusField, statusFilter, enableTags, tagFilter])

  const list = usePagedCollection(collectionName, {
    searchTerm: debouncedQuery,
    where: whereFilters,
    limitCount: pageSize,
    orderByField,
    orderDirection,
  })
  const { items, loading, error, create, set, update, remove, refresh } = list
  const tagColumn = useMemo(() => ({
    key: 'tagIds',
    label: 'Etiquetas',
    render: (row) => <TagList tagIds={row.tagIds} tags={availableTags} />,
    exportValue: (row) => tagNamesFromIds(row.tagIds, availableTags).join(', ') || '-',
  }), [availableTags])
  const effectiveFields = useMemo(() => enableTags ? [
    ...fields,
    { name: 'tagIds', label: 'Etiquetas', type: 'tagPicker', options: tagOptions, hint: tagOptions.length ? 'Podés asignar varias etiquetas para filtrar e identificar rápido.' : 'Creá etiquetas desde Configuración > Etiquetas.' },
  ] : fields, [enableTags, fields, tagOptions])
  const effectiveColumns = useMemo(() => enableTags ? [...columns, tagColumn] : columns, [columns, enableTags, tagColumn])
  const effectiveExportColumns = useMemo(() => {
    const base = exportColumns || columns
    return enableTags ? [...base, tagColumn] : base
  }, [columns, enableTags, exportColumns, tagColumn])
  const effectiveSearchFields = useMemo(() => enableTags ? [...new Set([...searchFields, 'tagNames'])] : searchFields, [enableTags, searchFields])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(initialValues)
  const [saving, setSaving] = useState(false)
  const formId = useId()
  const feedback = useFeedback()

  useEffect(() => {
    list.reset?.()
  }, [debouncedQuery, dateFrom, dateTo, statusFilter, tagFilter])

  const pageRows = items

  function clearFilters() {
    setQuery('')
    setDateFrom('')
    setDateTo('')
    setStatusFilter('')
    setTagFilter('')
  }

  function openCreate() {
    if (!canWrite) {
      feedback.warning('No tenés permiso para crear registros en esta sección.')
      return
    }
    setEditing(null)
    setForm(enableTags ? { ...initialValues, tagIds: [] } : initialValues)
    setModalOpen(true)
  }

  function openEdit(row) {
    if (!canWrite) {
      feedback.warning('No tenés permiso para editar registros en esta sección.')
      return
    }
    setEditing(row)
    setForm({ ...initialValues, ...(documentIdField ? { [documentIdField]: row.id } : {}), ...stringifyPayload(row) })
    setModalOpen(true)
  }

  function handleChange(name, value, field) {
    setForm((current) => {
      let next = { ...current, [name]: value }

      if (typeof field?.onChange === 'function') {
        const patch = field.onChange({ value, form: next, previousForm: current, field })
        if (patch && typeof patch === 'object') next = { ...next, ...patch }
      }

      return next
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      let payload = normalizePayload(form, effectiveFields)
      if (enableTags) payload = { ...payload, tagNames: tagNamesFromIds(payload.tagIds, availableTags) }
      if (beforeSave) payload = await beforeSave(payload, editing)
      payload = { ...payload, ...buildSearchPayload(payload, effectiveSearchFields) }
      let savedId = editing?.id || ''
      if (editing) savedId = await update(editing.id, payload)
      else if (documentIdField && payload[documentIdField]) savedId = await set(String(payload[documentIdField]).trim(), payload)
      else savedId = await create(payload)
      if (afterSave) await afterSave(payload, editing, savedId)
      feedback.success(editing ? 'El registro se actualizó correctamente.' : 'El registro se creó correctamente.')
      setModalOpen(false)
      refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo guardar el registro.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(row) {
    if (!canDelete) {
      feedback.warning('No tenés permiso para eliminar registros en esta sección.')
      return
    }
    const ok = await feedback.confirm({
      title: 'Eliminar registro',
      message: `¿Eliminar ${row.name || row.displayName || row.id}? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await remove(row.id)
      feedback.success('El registro fue eliminado correctamente.')
      refresh?.()
    } catch (error) {
      feedback.error(error?.message || 'No se pudo eliminar el registro.')
    }
  }

  if (!canRead) {
    return (
      <section className="access-denied-panel">
        <div className="system-card system-card-danger">
          <div className="system-icon">!</div>
          <p className="eyebrow">Acceso restringido</p>
          <h1>No tenés permiso para ver esta sección</h1>
          <p>Solicitá acceso a un administrador del sistema.</p>
        </div>
      </section>
    )
  }

  return (
    <section>
      <SectionHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <ExportButtons
              title={title}
              subtitle={exportSubtitle || `${description || title}. Exporta todos los registros filtrados hasta el máximo seguro de lectura.`}
              rows={pageRows}
              getRows={list.fetchAllForExport}
              columns={effectiveExportColumns}
              summary={exportSummary || [
                { label: 'Registros en esta página', value: pageRows.length },
                ...(debouncedQuery ? [{ label: 'Búsqueda', value: debouncedQuery }] : []),
                ...(dateFrom || dateTo ? [{ label: 'Rango', value: `${dateFrom || 'inicio'} a ${dateTo || 'hoy'}` }] : []),
                ...(statusFilter ? [{ label: 'Estado', value: statusFilter }] : []),
                ...(tagFilter ? [{ label: 'Etiqueta', value: availableTags.find((tag) => tag.id === tagFilter)?.name || tagFilter }] : []),
              ]}
              fileLabel={exportFileLabel || title}
            />
            {extraHeaderActions}
            {canWrite && <button className="btn btn-primary" onClick={openCreate}>{createLabel}</button>}
          </>
        }
      />

      <ListToolbar
        query={query}
        onQueryChange={setQuery}
        placeholder={searchPlaceholder}
        dateFrom={showDateFilters ? dateFrom : undefined}
        dateTo={showDateFilters ? dateTo : undefined}
        onDateFromChange={showDateFilters ? setDateFrom : undefined}
        onDateToChange={showDateFilters ? setDateTo : undefined}
        status={showStatusFilter ? statusFilter : undefined}
        onStatusChange={showStatusFilter ? setStatusFilter : undefined}
        statusOptions={showStatusFilter ? finalStatusOptions : []}
        extraActive={Boolean(tagFilter)}
        onClearFilters={clearFilters}
      >
        {enableTags && <TagFilter value={tagFilter} options={tagOptions} onChange={setTagFilter} />}
      </ListToolbar>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? (
        <div className="panel">Cargando registros...</div>
      ) : (
        <>
          <DataTable
            rows={pageRows}
            columns={effectiveColumns}
            empty={emptyState}
            actions={(row) => (
              <>
                <IndividualExportActions
                  row={row}
                  columns={effectiveExportColumns}
                  title={title}
                  subtitle="Detalle individual con los datos visibles y relacionados configurados para esta seccion."
                  fileLabel={exportFileLabel || title}
                />
                {typeof extraRowActions === 'function' && extraRowActions(row)}
                {canWrite && <button className="btn btn-small" onClick={() => openEdit(row)}>Editar</button>}
                {canDelete && <button className="btn btn-small btn-danger" onClick={() => handleDelete(row)}>Eliminar</button>}
              </>
            )}
          />
          <Pagination
            {...list}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            total={pageRows.length}
            limit={pageSize}
          />
        </>
      )}

      {modalOpen && (
        <Modal
          title={editing ? `Editar ${title}` : createLabel}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" type="submit" form={formId} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          <form id={formId} onSubmit={handleSubmit}>
            <FormGrid fields={effectiveFields} value={form} onChange={handleChange} />
          </form>
        </Modal>
      )}
    </section>
  )
}
