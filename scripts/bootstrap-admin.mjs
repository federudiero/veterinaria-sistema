import { createSign } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { DEFAULT_ROLE_PERMISSIONS } from '../src/data/permissions.js'

function parseArgs(argv) {
  const args = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) continue
    const key = item.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      index += 1
    }
  }
  return args
}

function loadEnvFile() {
  const envPath = '.env'
  if (!existsSync(envPath)) return {}
  const raw = readFileSync(envPath, 'utf8')
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=')
        return [key.trim(), rest.join('=').trim().replace(/^['"]|['"]$/g, '')]
      }),
  )
}

function base64Url(input) {
  return Buffer.from(input).toString('base64url')
}

function signJwt(serviceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsigned)
  signer.end()
  const signature = signer.sign(serviceAccount.private_key, 'base64url')
  return `${unsigned}.${signature}`
}

async function getAccessToken(serviceAccount) {
  const jwt = signJwt(serviceAccount)
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`No se pudo obtener access_token: ${JSON.stringify(data)}`)
  }
  return data.access_token
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number' && Number.isInteger(value)) return { integerValue: String(value) }
  if (typeof value === 'number') return { doubleValue: value }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, firestoreValue(item)])),
      },
    }
  }
  return { stringValue: String(value) }
}

function normalizeForSearch(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9@.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTokens(...values) {
  const text = normalizeForSearch(values.filter(Boolean).join(' '))
  return Array.from(new Set(text.split(' ').filter(Boolean).flatMap((token) => {
    const chunks = [token]
    if (token.includes('@')) chunks.push(...token.split('@'))
    if (token.includes('.')) chunks.push(...token.split('.'))
    return chunks.filter((item) => item.length >= 2)
  }))).slice(0, 40)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const env = { ...loadEnvFile(), ...process.env }

  const serviceAccountPath = args.serviceAccount || env.GOOGLE_APPLICATION_CREDENTIALS
  const uid = args.uid
  const email = args.email
  const displayName = args.name || args.displayName || email
  const role = args.role || 'admin'
  const tenantId = args.tenant || env.VITE_FIREBASE_TENANT_ID || 'defaultVet'

  if (!serviceAccountPath) throw new Error('Falta --serviceAccount o GOOGLE_APPLICATION_CREDENTIALS con la ruta al JSON de service account.')
  if (!uid) throw new Error('Falta --uid con el UID real del usuario creado en Firebase Authentication.')
  if (!email) throw new Error('Falta --email.')
  if (!DEFAULT_ROLE_PERMISSIONS[role]) throw new Error(`Rol inválido: ${role}.`)

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
  const projectId = args.project || env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id
  if (!projectId) throw new Error('No se pudo detectar projectId. Pasá --project o configurá VITE_FIREBASE_PROJECT_ID.')

  const now = new Date()
  const searchText = normalizeForSearch(`${displayName} ${email} ${role}`)
  const payload = {
    uid,
    email,
    displayName,
    role,
    active: true,
    permissions: DEFAULT_ROLE_PERMISSIONS[role],
    createdAt: now,
    updatedAt: now,
    searchText,
    searchTokens: buildTokens(displayName, email, role),
  }

  const accessToken = await getAccessToken(serviceAccount)
  const documentUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(uid)}`

  const response = await fetch(documentUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, firestoreValue(value)])),
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Firestore rechazó la escritura: ${JSON.stringify(data)}`)
  }

  console.log('Usuario administrador cargado correctamente.')
  console.log(`Ruta: tenants/${tenantId}/users/${uid}`)
  console.log(`Email: ${email}`)
  console.log(`Rol: ${role}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
