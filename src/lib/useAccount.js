import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'deskra-account'

const DEFAULTS = {
  namaOperator: '',
  namaTpk: 'Wongsorejo',
  kodeTpk: '',
}

function getInitial() {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function useAccount() {
  const [account, setAccount] = useState(getInitial)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setAccount(getInitial())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const save = useCallback((next) => {
    setAccount(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
  }, [])

  return { account, save }
}

export function getAccount() {
  return getInitial()
}

export function getNamaTpk() {
  return getInitial().namaTpk || DEFAULTS.namaTpk
}

export function getNamaTpkUpper() {
  return getNamaTpk().toUpperCase()
}
