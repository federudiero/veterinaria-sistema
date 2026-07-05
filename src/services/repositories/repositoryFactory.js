import { canUseFirebase, canUseLocalRepository, firebaseStartupError } from '../firebase/config.js'
import * as firestoreRepository from './firestoreRepository.js'
import * as localRepository from './localRepository.js'

const blockedRepository = {
  subscribeCollection(_collectionName, _callback, onError) {
    const error = new Error(firebaseStartupError || 'El repositorio no está disponible por configuración incompleta.')
    onError?.(error)
    return () => undefined
  },
  async fetchCollectionPage() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async fetchCollectionForExport() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async getCollectionCount() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async createDocument() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async ensureDailyCashSession() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async setDocument() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async updateDocument() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async deleteDocument() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async seedDemoData() { throw new Error('Los datos demo están deshabilitados en esta configuración.') },

  async createSaleTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async createReminderSaleTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async collectSaleTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async voidSaleTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async createPurchaseTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async voidPurchaseTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async collectCurrentAccountTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async createCashMovementTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async closeCashTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
  async closeGlobalCashTransaction() { throw new Error(firebaseStartupError || 'Repositorio no disponible.') },
}

export const isFirebaseMode = canUseFirebase
export const isLocalDemoMode = !canUseFirebase && canUseLocalRepository
export const repository = canUseFirebase ? firestoreRepository : canUseLocalRepository ? localRepository : blockedRepository
