import { useEffect, useState } from 'react'

export function readStoredJson(storage, key, fallback) {
  try {
    return JSON.parse(storage.getItem(key)) || fallback
  } catch {
    return fallback
  }
}

export function writeStoredJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value))
}

export function useRegisterKaplingColumnSettings({
  colMapStorageKey,
  defaultColMap,
  excelHeadersStorageKey,
  storage = localStorage,
}) {
  const [colMap, setColMap] = useState(() => readStoredJson(storage, colMapStorageKey, defaultColMap))
  const [excelHeaders, setExcelHeaders] = useState(() => readStoredJson(storage, excelHeadersStorageKey, []))
  const [showSettings, setShowSettings] = useState(false)
  const [draftMap, setDraftMap] = useState(defaultColMap)

  useEffect(() => {
    setColMap(readStoredJson(storage, colMapStorageKey, defaultColMap))
    setExcelHeaders(readStoredJson(storage, excelHeadersStorageKey, []))
  }, [colMapStorageKey, defaultColMap, excelHeadersStorageKey, storage])

  function saveColMap(newMap) {
    setColMap(newMap)
    writeStoredJson(storage, colMapStorageKey, newMap)
  }

  function saveExcelHeaders(headers) {
    setExcelHeaders(headers)
    writeStoredJson(storage, excelHeadersStorageKey, headers)
  }

  return {
    colMap,
    draftMap,
    excelHeaders,
    saveColMap,
    saveExcelHeaders,
    setDraftMap,
    setShowSettings,
    showSettings,
  }
}
