export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '6.0.0'

export const APP_ENV = String(import.meta.env.VITE_APP_ENV || import.meta.env.MODE || 'development').toLowerCase()
export const IS_PRODUCTION = APP_ENV === 'production' || import.meta.env.PROD === true
export const IS_DEVELOPMENT = !IS_PRODUCTION

export const REQUIRE_FIREBASE = IS_PRODUCTION || import.meta.env.VITE_REQUIRE_FIREBASE === 'true'
export const REQUIRE_APP_CHECK = import.meta.env.VITE_REQUIRE_APPCHECK === 'true'
export const ALLOW_LOCAL_DEMO = !IS_PRODUCTION && import.meta.env.VITE_ALLOW_LOCAL_DEMO !== 'false'
export const ALLOW_DEMO_SEED = !IS_PRODUCTION && import.meta.env.VITE_ALLOW_DEMO_SEED !== 'false'

export const APP_BRAND_NAME = import.meta.env.VITE_APP_BRAND_NAME || 'Sistema Veterinaria'
export const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || ''

export function getRuntimeModeLabel({ firebaseMode, emulators }) {
  if (firebaseMode && emulators) return 'Firebase emuladores'
  if (firebaseMode) return 'Firebase producción'
  if (ALLOW_LOCAL_DEMO) return 'Modo local demo'
  return 'Modo no configurado'
}
