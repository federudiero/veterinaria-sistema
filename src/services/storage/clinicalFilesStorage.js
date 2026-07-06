import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase/client.js'
import { TENANT_ID } from '../firebase/config.js'

export const MAX_CLINICAL_PDF_SIZE_BYTES = 10 * 1024 * 1024

function assertStorage() {
  if (!storage) {
    throw new Error('Firebase Storage no está inicializado. Revisá la configuración de Firebase y habilitá Storage en el proyecto.')
  }
}

function cleanId(value, fallback = 'sin-id') {
  const text = String(value || '').trim()
  return text.replace(/[^a-zA-Z0-9_-]/g, '_') || fallback
}

export function isValidClinicalPdf(file) {
  if (!file) return false
  const isPdfType = file.type === 'application/pdf'
  const isPdfName = String(file.name || '').toLowerCase().endsWith('.pdf')
  return (isPdfType || isPdfName) && file.size <= MAX_CLINICAL_PDF_SIZE_BYTES
}

export function buildClinicalPdfStoragePath({ clientId, patientId, fileId }) {
  return `tenants/${cleanId(TENANT_ID)}/clients/${cleanId(clientId)}/patients/${cleanId(patientId)}/clinical-files/${cleanId(fileId)}`
}

export async function uploadClinicalPdf({ file, clientId, patientId, fileId }) {
  assertStorage()
  if (!isValidClinicalPdf(file)) {
    throw new Error('El archivo debe ser PDF y pesar como máximo 10 MB.')
  }

  const storagePath = buildClinicalPdfStoragePath({ clientId, patientId, fileId })
  const fileRef = ref(storage, storagePath)
  await uploadBytes(fileRef, file, {
    contentType: 'application/pdf',
    customMetadata: {
      tenantId: TENANT_ID,
      clientId: String(clientId || ''),
      patientId: String(patientId || ''),
      clinicalFileId: String(fileId || ''),
      originalName: String(file.name || 'documento.pdf'),
    },
  })
  return storagePath
}

export async function getClinicalPdfUrl(storagePath) {
  assertStorage()
  if (!storagePath) throw new Error('El documento no tiene ruta de Storage.')
  return getDownloadURL(ref(storage, storagePath))
}

export async function deleteClinicalPdf(storagePath) {
  assertStorage()
  if (!storagePath) return
  await deleteObject(ref(storage, storagePath))
}
