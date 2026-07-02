const TOKEN_MIN = 2
const TOKEN_MAX = 24
const MAX_TOKENS = 180

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function onlyDigits(value) {
  return String(value ?? '').replace(/\D+/g, '')
}

function addPrefixes(target, rawToken) {
  const token = normalizeSearchText(rawToken)
  if (!token || token.length < TOKEN_MIN) return
  const capped = token.slice(0, TOKEN_MAX)
  for (let i = TOKEN_MIN; i <= capped.length; i += 1) {
    target.add(capped.slice(0, i))
  }
}

function flattenPrimitiveValues(value, output = []) {
  if (value == null) return output
  if (['string', 'number', 'boolean'].includes(typeof value)) {
    output.push(String(value))
    return output
  }
  if (Array.isArray(value)) {
    value.forEach((item) => flattenPrimitiveValues(item, output))
    return output
  }
  if (typeof value === 'object') {
    Object.values(value).forEach((item) => flattenPrimitiveValues(item, output))
  }
  return output
}

export function buildSearchPayload(payload = {}, preferredFields = []) {
  const values = preferredFields.length
    ? preferredFields.flatMap((field) => flattenPrimitiveValues(payload[field]))
    : flattenPrimitiveValues(payload)

  const normalizedText = normalizeSearchText(values.join(' '))
  const tokens = new Set()

  normalizedText.split(' ').forEach((token) => addPrefixes(tokens, token))

  values.forEach((value) => {
    const digits = onlyDigits(value)
    if (digits.length >= TOKEN_MIN) {
      addPrefixes(tokens, digits)
      if (digits.length > 6) addPrefixes(tokens, digits.slice(-6))
    }
  })

  return {
    searchText: normalizedText.slice(0, 3000),
    searchTokens: Array.from(tokens).slice(0, MAX_TOKENS),
  }
}

export function matchesSearch(payload, term, fields = []) {
  const normalizedTerm = normalizeSearchText(term)
  if (!normalizedTerm) return true

  const tokens = Array.isArray(payload?.searchTokens) ? payload.searchTokens : []
  if (tokens.includes(normalizedTerm)) return true

  const searchText = payload?.searchText || buildSearchPayload(payload, fields).searchText
  if (searchText.includes(normalizedTerm)) return true

  const digits = onlyDigits(term)
  if (digits.length >= TOKEN_MIN) {
    return searchText.includes(digits) || tokens.includes(digits)
  }

  return false
}
