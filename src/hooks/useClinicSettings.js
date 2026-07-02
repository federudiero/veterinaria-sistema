import { useMemo } from 'react'
import { useCollection } from './useCollection.js'

const DEFAULT_SYSTEM_NAME = 'Sistema Veterinaria'

function cleanClinicName(value) {
  if (!value || /veterinaria\s+gen[eé]rica/i.test(String(value))) return DEFAULT_SYSTEM_NAME
  return String(value)
}

export function useClinicSettings() {
  const settings = useCollection('settings', { limitCount: 20 })
  return useMemo(() => {
    const app = settings.items.find((item) => item.id === 'app') || {}
    return {
      clinicName: cleanClinicName(app.clinicName),
      legalName: app.legalName || '',
      cuit: app.cuit || '',
      taxCondition: app.taxCondition || '',
      address: app.address || '',
      phone: app.phone || '',
      whatsapp: app.whatsapp || '',
      emergencyPhone: app.emergencyPhone || '',
      email: app.email || '',
      website: app.website || '',
      instagram: app.instagram || '',
      logoUrl: app.logoUrl || '',
      logoText: app.logoText || '',
      primaryColor: app.primaryColor || '#0f766e',
      professionalLicense: app.professionalLicense || '',
      footerNote: app.footerNote || '',
      currency: app.currency || 'ARS',
      timezone: app.timezone || 'America/Argentina/Cordoba',
      businessHours: app.businessHours || '',
      appointmentInterval: app.appointmentInterval || 30,
      defaultAppointmentDuration: app.defaultAppointmentDuration || app.appointmentInterval || 30,
      defaultReminderChannel: app.defaultReminderChannel || 'WhatsApp',
      defaultReminderText: app.defaultReminderText || '',
      defaultPaymentMethod: app.defaultPaymentMethod || 'Efectivo',
      defaultConsultationPrice: app.defaultConsultationPrice || 0,
      defaultLowStockWarning: app.defaultLowStockWarning || 0,
    }
  }, [settings.items])
}
