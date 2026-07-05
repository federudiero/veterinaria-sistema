export function isAdminUser(user) {
  return user?.role === 'admin'
}

export function assignedShiftUserIds(shift = {}) {
  return Array.isArray(shift.veterinarianIds) ? shift.veterinarianIds.filter(Boolean) : []
}

export function assignedShiftUserNames(shift = {}) {
  return Array.isArray(shift.veterinarianNames) ? shift.veterinarianNames.filter(Boolean) : []
}

export function isShiftOpen(shift = {}) {
  return shift.status !== 'Cerrado'
}

function todayISO() {
  const value = new Date()
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function sharedDailyCashSessionId(date = '') {
  return `daily_${date || todayISO()}`
}

export function isSharedDailyCashSession(shift = {}) {
  return shift.cashSessionScope === 'sharedDaily' || shift.sharedDaily === true || String(shift.id || '').startsWith('daily_')
}

export function findDailyCashSession(shifts = [], date = '') {
  if (!date) return null
  return shifts.find((shift) => shift.date === date && isSharedDailyCashSession(shift)) || null
}

export function findOpenDailyCashSession(shifts = [], date = '') {
  const shift = findDailyCashSession(shifts, date)
  return shift && isShiftOpen(shift) ? shift : null
}

export function isUserAssignedToShift(shift = {}, user = {}) {
  if (!shift?.id || !user?.uid) return false
  if (isSharedDailyCashSession(shift)) return true
  if (isAdminUser(user)) return true

  const assignedIds = assignedShiftUserIds(shift)
  if (!assignedIds.length) return false

  return assignedIds.includes(user.uid) || assignedIds.includes(user.id) || assignedIds.includes(user.email)
}

export function canUseShiftForOperation(shift = {}, user = {}, date = '') {
  if (!shift?.id) return false
  if (date && shift.date !== date) return false
  if (!isShiftOpen(shift)) return false
  if (isSharedDailyCashSession(shift)) return true
  return isUserAssignedToShift(shift, user)
}

export function filterOpenShiftsForUser(shifts = [], user = {}, date = '') {
  return shifts.filter((shift) => canUseShiftForOperation(shift, user, date))
}

export function filterOpenSharedDailyCashSessions(shifts = [], date = '') {
  return shifts.filter((shift) => {
    if (!isSharedDailyCashSession(shift)) return false
    if (date && shift.date !== date) return false
    return isShiftOpen(shift)
  })
}

export function shiftResponsibleLabel(shift = {}) {
  if (isSharedDailyCashSession(shift)) {
    if (shift.closedByName) return `Cerrada por ${shift.closedByName}`
    if (shift.openedByName) return `Abierta por ${shift.openedByName}`
    return 'Caja compartida'
  }
  const names = assignedShiftUserNames(shift)
  if (names.length) return names.join(', ')
  return 'Sin responsable asignado'
}

export function cashSessionDisplayName(shift = {}) {
  if (isSharedDailyCashSession(shift)) return `Caja del día${shift.date ? ` - ${shift.date}` : ''}`
  return shift.name || 'Caja del día'
}

export function shiftOptionLabel(shift = {}) {
  if (isSharedDailyCashSession(shift)) {
    return `${cashSessionDisplayName(shift)} (${shift.status || 'Abierto'})`
  }
  const schedule = [shift.startTime, shift.endTime].filter(Boolean).join('-')
  const responsible = shiftResponsibleLabel(shift)
  return `${cashSessionDisplayName(shift)}${schedule ? ` ${schedule}` : ''} · ${responsible}`
}

export function userOperationId(user = {}) {
  return user.uid || user.id || user.email || ''
}

export function userOperationName(user = {}) {
  return user.displayName || user.email || user.uid || 'Usuario'
}

export function buildSharedDailyCashSessionPayload(user = {}, date = '', overrides = {}) {
  return {
    id: sharedDailyCashSessionId(date),
    date,
    name: 'Caja del día',
    cashSessionScope: 'sharedDaily',
    sharedDaily: true,
    startTime: overrides.startTime || '',
    endTime: overrides.endTime || '',
    veterinarianIds: [],
    veterinarianNames: [],
    cashierIds: [],
    cashierNames: [],
    responsibleUserIds: [],
    responsibleUserNames: [],
    openedBy: userOperationId(user),
    openedByName: userOperationName(user),
    status: 'Abierto',
    notes: overrides.notes || 'Caja diaria compartida para todo el negocio.',
  }
}

export function buildUserCashSessionPayload(user = {}, date = '', overrides = {}) {
  return buildSharedDailyCashSessionPayload(user, date, overrides)
}

export function shiftUserPayload(shift = {}) {
  if (isSharedDailyCashSession(shift)) {
    return {
      veterinarianIds: [],
      veterinarianNames: [],
      cashierIds: [],
      cashierNames: [],
      responsibleUserIds: [],
      responsibleUserNames: [],
    }
  }

  return {
    veterinarianIds: assignedShiftUserIds(shift),
    veterinarianNames: assignedShiftUserNames(shift),
    cashierIds: assignedShiftUserIds(shift),
    cashierNames: assignedShiftUserNames(shift),
    responsibleUserIds: assignedShiftUserIds(shift),
    responsibleUserNames: assignedShiftUserNames(shift),
  }
}
