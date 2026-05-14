export function getEffectiveTpkId({ activeTpkId, profile } = {}) {
  const active = String(activeTpkId || '').trim()
  if (active) return active
  return String(profile?.tpk_id || '').trim()
}

export function getTpkName(periode, fallback = 'TPK Wongsorejo') {
  return periode?.tabel_tpk?.namatpk || periode?.tpk?.namatpk || fallback
}

export function getTpkNameUpper(periode, fallback) {
  return getTpkName(periode, fallback).toUpperCase()
}
