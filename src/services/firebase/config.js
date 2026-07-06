import { ALLOW_LOCAL_DEMO, IS_PRODUCTION, REQUIRE_APP_CHECK, REQUIRE_FIREBASE } from '../../config/runtime.js'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
}

export const TENANT_ID = import.meta.env.VITE_FIREBASE_TENANT_ID || 'defaultVet'
export const USE_FIREBASE = import.meta.env.VITE_USE_FIREBASE === 'true' || REQUIRE_FIREBASE
export const USE_EMULATORS = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

const requiredFirebaseKeys = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket']
export const missingFirebaseConfigKeys = requiredFirebaseKeys.filter((key) => !firebaseConfig[key])

export const hasFirebaseConfig = missingFirebaseConfigKeys.length === 0
export const canUseFirebase = USE_FIREBASE && hasFirebaseConfig
export const canUseLocalRepository = !canUseFirebase && ALLOW_LOCAL_DEMO

export const APP_CHECK_SITE_KEY = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY || ''
export const APP_CHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || ''
export const APP_CHECK_ENABLED = canUseFirebase && Boolean(APP_CHECK_SITE_KEY)

export const firebaseStartupError = (() => {
  if (REQUIRE_FIREBASE && !USE_FIREBASE) {
    return 'El modo producción requiere VITE_USE_FIREBASE=true.'
  }

  if (REQUIRE_FIREBASE && !hasFirebaseConfig) {
    return `Faltan variables Firebase obligatorias: ${missingFirebaseConfigKeys.join(', ')}.`
  }

  if (USE_FIREBASE && !hasFirebaseConfig && !ALLOW_LOCAL_DEMO) {
    return `Firebase fue solicitado, pero faltan variables: ${missingFirebaseConfigKeys.join(', ')}.`
  }

  if (IS_PRODUCTION && USE_EMULATORS) {
    return 'Los emuladores de Firebase no pueden estar activos en produccion. Defini VITE_USE_FIREBASE_EMULATORS=false.'
  }

  if (REQUIRE_APP_CHECK && !APP_CHECK_SITE_KEY) {
    return 'App Check está marcado como obligatorio, pero falta VITE_FIREBASE_APPCHECK_SITE_KEY.'
  }

  return ''
})()
