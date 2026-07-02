export const CREDIT_PAYMENT_METHOD = 'Credito'
export const DEFAULT_CREDIT_SURCHARGE_PERCENT = 15
export const CREDIT_SURCHARGE_OPTIONS = [0, 5, 10, 15, 20, 25, 30]

export function isCreditPaymentMethod(method) {
  return String(method || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim() === 'credito'
}

export function normalizeCreditSurchargePercent(value) {
  const normalizedValue = typeof value === 'string' ? value.replace(',', '.') : value
  const parsed = Number(normalizedValue)
  if (!Number.isFinite(parsed)) return DEFAULT_CREDIT_SURCHARGE_PERCENT
  return Math.min(100, Math.max(0, parsed))
}

export function calculateSalePricing({ subtotal = 0, paymentMethod = '', creditSurchargePercent = DEFAULT_CREDIT_SURCHARGE_PERCENT } = {}) {
  const normalizedSubtotal = Math.max(0, Number(subtotal) || 0)
  if (!isCreditPaymentMethod(paymentMethod)) {
    return {
      subtotal: normalizedSubtotal,
      creditSurchargePercent: 0,
      creditSurchargeAmount: 0,
      total: normalizedSubtotal,
    }
  }

  const normalizedPercent = normalizeCreditSurchargePercent(creditSurchargePercent)
  const creditSurchargeAmount = Math.round((normalizedSubtotal * normalizedPercent) / 100)

  return {
    subtotal: normalizedSubtotal,
    creditSurchargePercent: normalizedPercent,
    creditSurchargeAmount,
    total: normalizedSubtotal + creditSurchargeAmount,
  }
}

export function paymentLabelWithSurcharge(paymentMethod, percent) {
  if (!isCreditPaymentMethod(paymentMethod) || !Number(percent)) return paymentMethod || '-'
  return `${paymentMethod} +${Number(percent)}%`
}
