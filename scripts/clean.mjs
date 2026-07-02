import { rmSync, existsSync } from 'node:fs'

const targets = ['node_modules', 'dist', '.vite', '.firebase', 'firebase-debug.log']
for (const target of targets) {
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true })
    console.log(`Eliminado: ${target}`)
  }
}
console.log('Limpieza finalizada.')
