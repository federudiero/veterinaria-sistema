import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../services/firebase/client.js'
import { TENANT_ID } from '../services/firebase/config.js'
import { isFirebaseMode, isLocalDemoMode } from '../services/repositories/repositoryFactory.js'
import { DEFAULT_ROLE_PERMISSIONS } from '../data/permissions.js'

const AuthContext = createContext(null)

const demoUser = {
  uid: 'demo-admin',
  email: 'admin@vetgest.local',
  displayName: 'Administrador demo',
  role: 'admin',
  active: true,
  permissions: DEFAULT_ROLE_PERMISSIONS.admin,
  profileStatus: 'active',
}

function buildFirebaseProfile(firebaseUser, profile = {}, status = 'active') {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: profile.displayName || firebaseUser.displayName || firebaseUser.email,
    role: profile.role || (status === 'missing' ? 'sin_perfil' : 'pendiente'),
    active: profile.active === true,
    permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
    profileStatus: status,
    profileExists: status !== 'missing',
    createdAt: profile.createdAt || null,
    updatedAt: profile.updatedAt || null,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(isLocalDemoMode ? demoUser : null)
  const [loading, setLoading] = useState(isFirebaseMode)
  const [error, setError] = useState('')

  async function loadUserProfile(firebaseUser) {
    const profileRef = doc(db, 'tenants', TENANT_ID, 'users', firebaseUser.uid)
    const profileSnap = await getDoc(profileRef)
    if (!profileSnap.exists()) return buildFirebaseProfile(firebaseUser, {}, 'missing')
    const profile = profileSnap.data()
    return buildFirebaseProfile(firebaseUser, profile, profile.active === true ? 'active' : 'inactive')
  }

  useEffect(() => {
    if (!isFirebaseMode || !auth) return undefined

    setPersistence(auth, browserLocalPersistence).catch(() => null)
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        setUser(await loadUserProfile(firebaseUser))
      } catch {
        setUser(buildFirebaseProfile(firebaseUser, {}, 'permission_error'))
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  async function login(email, password) {
    setError('')
    if (isLocalDemoMode) {
      setUser({ ...demoUser, email: email || demoUser.email })
      return
    }

    if (!isFirebaseMode || !auth) {
      const message = 'Firebase Auth no está disponible. Revisá el .env antes de iniciar sesión.'
      setError(message)
      throw new Error(message)
    }

    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(err?.message || 'No se pudo iniciar sesión')
      throw err
    }
  }

  async function requestAccess(displayName = '') {
    if (!isFirebaseMode || !auth?.currentUser || !db) {
      throw new Error('Firebase no está disponible para registrar la solicitud de acceso.')
    }
    const firebaseUser = auth.currentUser
    const profileRef = doc(db, 'tenants', TENANT_ID, 'users', firebaseUser.uid)
    const payload = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: displayName || firebaseUser.displayName || firebaseUser.email,
      role: 'pendiente',
      active: false,
      permissions: [],
      accessRequestedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    await setDoc(profileRef, payload, { merge: false })
    setUser(buildFirebaseProfile(firebaseUser, payload, 'inactive'))
  }

  async function refreshProfile() {
    if (!isFirebaseMode || !auth?.currentUser) return
    setLoading(true)
    try {
      setUser(await loadUserProfile(auth.currentUser))
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    if (isFirebaseMode && auth) {
      await signOut(auth)
    }
    setUser(isLocalDemoMode ? demoUser : null)
  }

  function hasPermission(permission) {
    if (!permission) return true
    if (user?.role === 'admin' && user?.active !== false) return true
    if (user?.active === false) return false
    return user?.permissions?.includes(permission)
  }

  const value = useMemo(
    () => ({ user, loading, error, login, logout, hasPermission, requestAccess, refreshProfile, isFirebaseMode, isLocalDemoMode }),
    [user, loading, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return context
}
