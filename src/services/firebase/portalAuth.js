import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { canUseFirebase, firebaseConfig, USE_EMULATORS } from './config.js'

const SECONDARY_APP_NAME = 'portal-user-creator'
let emulatorConnected = false

function getSecondaryApp() {
  return getApps().some((app) => app.name === SECONDARY_APP_NAME)
    ? getApp(SECONDARY_APP_NAME)
    : initializeApp(firebaseConfig, SECONDARY_APP_NAME)
}

function getSecondaryAuth() {
  const secondaryAuth = getAuth(getSecondaryApp())

  if (USE_EMULATORS && !emulatorConnected) {
    connectAuthEmulator(secondaryAuth, 'http://127.0.0.1:9099', { disableWarnings: true })
    emulatorConnected = true
  }

  return secondaryAuth
}

function authErrorMessage(error) {
  if (error?.code === 'auth/email-already-in-use') {
    return 'Ese email ya existe en Firebase Authentication. Usá el UID existente o eliminá/recreá ese usuario desde Firebase Console.'
  }
  if (error?.code === 'auth/invalid-email') return 'El email del tutor no es válido.'
  if (error?.code === 'auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.'
  return error?.message || 'No se pudo crear el usuario en Firebase Authentication.'
}

export async function createPortalAuthUser({ email, password, displayName }) {
  if (!canUseFirebase) {
    throw new Error('Firebase Auth no está disponible. Revisá las variables VITE_FIREBASE_* y VITE_USE_FIREBASE=true.')
  }

  const normalizedEmail = String(email || '').trim().toLowerCase()
  const normalizedPassword = String(password || '')
  const normalizedDisplayName = String(displayName || normalizedEmail).trim()

  if (!normalizedEmail) throw new Error('Ingresá el email del tutor para crear el acceso al portal.')
  if (normalizedPassword.length < 6) throw new Error('Ingresá una contraseña inicial de al menos 6 caracteres.')

  const secondaryAuth = getSecondaryAuth()

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, normalizedEmail, normalizedPassword)
    if (normalizedDisplayName) {
      await updateProfile(credential.user, { displayName: normalizedDisplayName })
    }
    await signOut(secondaryAuth).catch(() => null)

    return {
      uid: credential.user.uid,
      email: credential.user.email || normalizedEmail,
      displayName: normalizedDisplayName,
    }
  } catch (error) {
    await signOut(secondaryAuth).catch(() => null)
    throw new Error(authErrorMessage(error))
  }
}

export async function disposePortalAuthCreator() {
  const secondaryApp = getApps().find((app) => app.name === SECONDARY_APP_NAME)
  if (secondaryApp) await deleteApp(secondaryApp)
  emulatorConnected = false
}
