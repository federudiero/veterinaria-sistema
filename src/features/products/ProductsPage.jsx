import React from 'react'
import { CrudPage } from '../common/CrudPage.jsx'
import { money } from '../../utils/formatters.js'

export function ProductsPage() {
  return (
    <CrudPage
      collectionName="products"
      eyebrow="Inventario"
      title="Productos y stock"
      description="Productos, servicios, costos, precios y stock operativo. El stock se modifica por ventas, compras y anulaciones para mantener trazabilidad."
      createLabel="Nuevo producto"
      searchFields={['name', 'sku', 'category', 'type']}
      initialValues={{ sku: '', name: '', category: '', type: 'Producto', cost: 0, price: 0, stock: 0, minStock: 0, unit: 'unidad', active: true }}
      fields={[
        { name: 'sku', label: 'SKU / código' },
        { name: 'name', label: 'Nombre', required: true },
        { name: 'category', label: 'Categoría' },
        { name: 'type', label: 'Tipo', type: 'select', options: ['Producto', 'Servicio'] },
        { name: 'cost', label: 'Costo', type: 'number' },
        { name: 'price', label: 'Precio venta', type: 'number' },
        { name: 'stock', label: 'Stock actual', type: 'number', readOnly: true, hint: 'Se actualiza automáticamente por ventas/compras. Para cargar stock, registrá una compra.' },
        { name: 'minStock', label: 'Stock mínimo', type: 'number' },
        { name: 'unit', label: 'Unidad', type: 'select', options: ['unidad', 'servicio', 'bolsa', 'frasco', 'caja', 'kg', 'litro'] },
        { name: 'active', label: 'Activo', type: 'checkbox' },
      ]}
      columns={[
        { key: 'sku', label: 'SKU' },
        { key: 'name', label: 'Producto' },
        { key: 'category', label: 'Categoría' },
        { key: 'type', label: 'Tipo' },
        { key: 'stock', label: 'Stock' },
        { key: 'minStock', label: 'Mínimo' },
        { key: 'price', label: 'Precio', render: (row) => money(row.price) },
      ]}
    />
  )
}
