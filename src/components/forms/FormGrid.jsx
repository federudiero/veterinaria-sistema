import React from 'react'
import { FormField } from './FormField.jsx'

export function FormGrid({ fields, value, onChange }) {
  return (
    <div className="form-grid">
      {fields.map((field) => (
        <FormField key={field.name} field={field} value={value[field.name]} form={value} onChange={onChange} />
      ))}
    </div>
  )
}
