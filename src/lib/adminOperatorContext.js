export function canUseOperatorRoutes({ isAdmin, activeTpkId } = {}) {
  if (!isAdmin) return true
  return String(activeTpkId || '').trim().length > 0
}

export function getAuthenticatedHomePath({ isAdmin, activeTpkId } = {}) {
  return canUseOperatorRoutes({ isAdmin, activeTpkId }) ? '/dashboard' : '/admin'
}
