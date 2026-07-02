import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import {
  APP_CHECK_DEBUG_TOKEN,
  APP_CHECK_ENABLED,
  APP_CHECK_SITE_KEY,
  firebaseConfig,
  canUseFirebase,
  USE_EMULATORS,
} from './config.js'

let app = null
let auth = null
let db = null
let appCheck = null
let emulatorsConnected = false

if (canUseFirebase) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)

  if (APP_CHECK_ENABLED && typeof window !== 'undefined') {
    if (APP_CHECK_DEBUG_TOKEN) {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = APP_CHECK_DEBUG_TOKEN === 'true' ? true : APP_CHECK_DEBUG_TOKEN
    }
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  }

  if (USE_EMULATORS && !emulatorsConnected) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    emulatorsConnected = true
  }
}

export { app, auth, db, appCheck }
