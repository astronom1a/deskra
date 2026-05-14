export function getTpkScopedStorageKey(baseKey, tpkId) {
  const scopedId = String(tpkId || '').trim()
  return scopedId ? `${baseKey}:${scopedId}` : baseKey
}
