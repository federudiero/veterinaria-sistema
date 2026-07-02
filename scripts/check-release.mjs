import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const errors = []
const warnings = []

function walk(dir, output = []) {
  if (!existsSync(dir)) return output
  for (const item of readdirSync(dir)) {
    if (['node_modules', 'dist', '.vite', '.firebase', '.git'].includes(item)) continue
    const full = join(dir, item)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full, output)
    else output.push(full)
  }
  return output
}

if (existsSync('node_modules')) warnings.push('node_modules existe. No lo incluyas en el ZIP fuente.')
if (existsSync('dist')) warnings.push('dist existe. Para ZIP fuente conviene entregarlo separado del build.')
if (existsSync('.env')) warnings.push('.env existe. No lo subas a repositorios ni lo compartas en ZIPs públicos.')
if (existsSync('.env.production.local')) warnings.push('.env.production.local existe. No lo incluyas en ZIPs públicos.')
if (!existsSync('.env.example')) errors.push('Falta .env.example con variables seguras de desarrollo.')
if (!existsSync('.env.production.example')) errors.push('Falta .env.production.example con variables seguras de producción.')

const files = walk('.')
for (const file of files) {
  const normalized = file.replaceAll('\\', '/')
  if (/firebase-adminsdk|service-account|private-key/i.test(normalized) && normalized.endsWith('.json')) {
    errors.push(`Posible service account privada detectada: ${normalized}`)
  }
  if (/\.env(\.|$)/.test(normalized) && !normalized.endsWith('.example')) {
    warnings.push(`Archivo env real detectado: ${normalized}`)
  }
  if (normalized.endsWith('.json') || normalized.endsWith('.env') || normalized.endsWith('.js') || normalized.endsWith('.mjs')) {
    const content = readFileSync(file, 'utf8')
    if (content.includes('-----BEGIN ' + 'PRIVATE KEY-----')) errors.push(`Clave privada detectada en: ${normalized}`)
  }
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const scripts = packageJson.scripts || {}
for (const key of ['preinstall', 'postinstall', 'prepare']) {
  if (scripts[key]) errors.push(`Script sensible detectado en package.json: ${key}`)
}

const dependencies = Object.keys(packageJson.dependencies || {})
const devDependencies = Object.keys(packageJson.devDependencies || {})
const allowed = new Set(['firebase', 'react', 'react-dom', 'react-router-dom', '@vitejs/plugin-react', 'vite'])
for (const dep of [...dependencies, ...devDependencies]) {
  if (!allowed.has(dep)) warnings.push(`Dependencia nueva para revisar manualmente: ${dep}`)
}

if (existsSync('package-lock.json')) {
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  if (lock.packages?.['']?.version !== packageJson.version) {
    warnings.push('La versión de package-lock.json no coincide con package.json.')
  }
}

if (errors.length) {
  console.error('Errores de release:')
  errors.forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

if (warnings.length) {
  console.warn('Advertencias de release:')
  warnings.forEach((warning) => console.warn(`- ${warning}`))
} else {
  console.log('Checklist de release sin advertencias.')
}
