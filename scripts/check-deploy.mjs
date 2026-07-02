import { existsSync, readFileSync } from 'node:fs'

const errors = []
const warnings = []

function readEnvFile() {
  const candidates = ['.env.production.local', '.env.production', '.env']
  const file = candidates.find((item) => existsSync(item))
  if (!file) {
    warnings.push('No se encontró .env. El build puede funcionar, pero deploy:hosting necesita variables reales en el entorno.')
    return { file: '', values: {} }
  }
  const raw = readFileSync(file, 'utf8')
  const values = Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const [key, ...rest] = line.split('=')
        return [key.trim(), rest.join('=').trim().replace(/^['"]|['"]$/g, '')]
      }),
  )
  return { file, values }
}

const { file, values } = readEnvFile()
const env = { ...values, ...process.env }

function required(key) {
  if (!env[key]) errors.push(`Falta ${key}.`)
}

required('VITE_FIREBASE_API_KEY')
required('VITE_FIREBASE_AUTH_DOMAIN')
required('VITE_FIREBASE_PROJECT_ID')
required('VITE_FIREBASE_APP_ID')
required('VITE_FIREBASE_TENANT_ID')

if (env.VITE_APP_ENV !== 'production') warnings.push('VITE_APP_ENV no está en production.')
if (env.VITE_USE_FIREBASE !== 'true') errors.push('VITE_USE_FIREBASE debe ser true para deploy comercial.')
if (env.VITE_REQUIRE_FIREBASE !== 'true') warnings.push('VITE_REQUIRE_FIREBASE debería ser true en producción.')
if (env.VITE_ALLOW_LOCAL_DEMO !== 'false') warnings.push('VITE_ALLOW_LOCAL_DEMO debería ser false en producción.')
if (env.VITE_ALLOW_DEMO_SEED !== 'false') warnings.push('VITE_ALLOW_DEMO_SEED debería ser false en producción.')
if (env.VITE_USE_FIREBASE_EMULATORS === 'true') errors.push('VITE_USE_FIREBASE_EMULATORS no puede estar true en producción.')
if ((env.VITE_REQUIRE_APPCHECK === 'true') && !env.VITE_FIREBASE_APPCHECK_SITE_KEY) {
  errors.push('VITE_REQUIRE_APPCHECK=true pero falta VITE_FIREBASE_APPCHECK_SITE_KEY.')
}
if (env.VITE_REQUIRE_APPCHECK !== 'true') warnings.push('App Check no está marcado como obligatorio. Recomendado antes de comercializar.')
if (!env.VITE_FIREBASE_APPCHECK_SITE_KEY) warnings.push('No hay site key de App Check/reCAPTCHA v3 configurada.')

if (!existsSync('firebase.json')) errors.push('Falta firebase.json.')
if (!existsSync('firestore.rules')) errors.push('Falta firestore.rules.')
if (!existsSync('firestore.indexes.json')) errors.push('Falta firestore.indexes.json.')

if (existsSync('firebase.json')) {
  const firebase = JSON.parse(readFileSync('firebase.json', 'utf8'))
  if (!firebase.hosting) errors.push('firebase.json no tiene configuración de hosting.')
  if (firebase.hosting?.public !== 'dist') errors.push('firebase.json hosting.public debe ser dist.')
  if (!Array.isArray(firebase.hosting?.rewrites) || !firebase.hosting.rewrites.some((item) => item.destination === '/index.html')) {
    errors.push('firebase.json debe tener rewrite SPA hacia /index.html.')
  }
  const headerGroups = Array.isArray(firebase.hosting?.headers) ? firebase.hosting.headers : []
  const configuredHeaders = new Set(headerGroups.flatMap((group) => (group.headers || []).map((header) => header.key)))
  for (const key of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Content-Security-Policy']) {
    if (!configuredHeaders.has(key)) warnings.push(`firebase.json no declara header de seguridad: ${key}.`)
  }
}

if (existsSync('.firebaserc')) {
  const firebaserc = JSON.parse(readFileSync('.firebaserc', 'utf8'))
  const project = firebaserc.projects?.default
  if (!project) warnings.push('.firebaserc no tiene projects.default configurado.')
  if (project && env.VITE_FIREBASE_PROJECT_ID && project !== env.VITE_FIREBASE_PROJECT_ID) {
    warnings.push(`.firebaserc usa ${project}, pero .env usa ${env.VITE_FIREBASE_PROJECT_ID}. Revisá que coincidan.`)
  }
} else {
  warnings.push('No existe .firebaserc. Ejecutá firebase use --add antes de deploy.')
}

if (file) console.log(`Variables leídas desde: ${file}`)

if (errors.length) {
  console.error('Errores de deploy:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

if (warnings.length) {
  console.warn('Advertencias de deploy:')
  warnings.forEach((warning) => console.warn(`- ${warning}`))
} else {
  console.log('Checklist de deploy sin advertencias.')
}
