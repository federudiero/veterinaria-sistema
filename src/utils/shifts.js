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

export function isUserAssignedToShift(shift = {}, user = {}) {
  if (!shift?.id || !user?.uid) return false
  if (isAdminUser(user)) return true

  const assignedIds = assignedShiftUserIds(shift)
  if (!assignedIds.length) return false

  return assignedIds.includes(user.uid) || assignedIds.includes(user.id) || assignedIds.includes(user.email)
}

export function canUseShiftForOperation(shift = {}, user = {}, date = '') {
  if (!shift?.id) return false
  if (date && shift.date !== date) return false
  if (!isShiftOpen(shift)) return false
  return isUserAssignedToShift(shift, user)
}

export function filterOpenShiftsForUser(shifts = [], user = {}, date = '') {
  return shifts.filter((shift) => canUseShiftForOperation(shift, user, date))
}

export function shiftResponsibleLabel(shift = {}) {
  const names = assignedShiftUserNames(shift)
  if (names.length) return names.join(', ')
  return 'Sin responsable asignado'
}

export function shiftOptionLabel(shift = {}) {
  const schedule = [shift.startTime, shift.endTime].filter(Boolean).join('-')
  const responsible = shiftResponsibleLabel(shift)
  return `${shift.name || 'Sin nombre'}${schedule ? ` ${schedule}` : ''} · ${responsible}`
}

export function shiftUserPayload(shift = {}) {
  return {
    veterinarianIds: assignedShiftUserIds(shift),
    veterinarianNames: assignedShiftUserNames(shift),
    cashierIds: assignedShiftUserIds(shift),
    cashierNames: assignedShiftUserNames(shift),
    responsibleUserIds: assignedShiftUserIds(shift),
    responsibleUserNames: assignedShiftUserNames(shift),
  }
}
