import { COLS } from './registerKaplingConstants.js'
import {
  displayDate,
  getMutuLabel,
  getPembeliName,
  simplifyRange,
} from './registerKaplingUtils.js'

export function getRegisterKaplingDisplayVal(row, key) {
  if (key === 'mutu_label') return getMutuLabel(row)
  if (key === 'tgl_kapling') return displayDate(row.tgl_kapling) || ''
  if (key === 'pembeli') return getPembeliName(row.pembeli) || ''
  if (key === 'volume') return Number(row.volume).toFixed(3)
  if ((key === 'panjang' || key === 'diameter_tebal') && Number(row.batang) <= 1) {
    return simplifyRange(String(row[key] ?? ''))
  }
  return String(row[key] ?? '')
}

export function getRegisterKaplingSortVal(row, key, cols = COLS) {
  if (key === 'mutu_label') return getMutuLabel(row).toLowerCase()
  if (key === 'tgl_kapling') return row.tgl_kapling || ''
  const col = cols.find(c => c.key === key)
  if (col?.num) return Number(row[key]) || 0
  return String(row[key] ?? '').toLowerCase()
}

export function sortRegisterKaplingRows(rows, sorts, cols = COLS) {
  if (!sorts?.length) return rows
  return [...rows].sort((a, b) => {
    for (const s of sorts) {
      const av = getRegisterKaplingSortVal(a, s.key, cols)
      const bv = getRegisterKaplingSortVal(b, s.key, cols)
      const col = cols.find(c => c.key === s.key)
      const cmp = col?.num ? av - bv : av < bv ? -1 : av > bv ? 1 : 0
      if (cmp !== 0) return s.dir === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

export function searchRegisterKaplingRows(rows, { searchTerm = '', searchCol = 'all', cols = COLS } = {}) {
  const q = searchTerm.trim().toLowerCase()
  if (!q) return rows
  return rows.filter(row => {
    if (searchCol === 'all') {
      return cols.some(c => getRegisterKaplingDisplayVal(row, c.key).toLowerCase().includes(q))
    }
    return getRegisterKaplingDisplayVal(row, searchCol).toLowerCase().includes(q)
  })
}

export function paginateRows(rows, { pageSize = 50, currentPage = 1 } = {}) {
  const totalPages = pageSize === 0 ? 1 : Math.ceil(rows.length / pageSize)
  const safePage = Math.min(currentPage, totalPages || 1)
  const displayedRows = pageSize === 0
    ? rows
    : rows.slice((safePage - 1) * pageSize, safePage * pageSize)
  return { totalPages, safePage, displayedRows }
}

export function getSelectionState(displayedRows, selectedIds = new Set()) {
  const displayedIds = displayedRows.map(r => r.id)
  const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedIds.has(id))
  const someSelected = displayedIds.some(id => selectedIds.has(id))
  return { displayedIds, allSelected, someSelected }
}

export function buildRegisterKaplingTableState({
  rows,
  sorts,
  searchTerm,
  searchCol,
  pageSize,
  currentPage,
  selectedIds,
  cols = COLS,
}) {
  const sortedRows = sortRegisterKaplingRows(rows, sorts, cols)
  const searchedRows = searchRegisterKaplingRows(sortedRows, { searchTerm, searchCol, cols })
  const { totalPages, safePage, displayedRows } = paginateRows(searchedRows, { pageSize, currentPage })
  const { displayedIds, allSelected, someSelected } = getSelectionState(displayedRows, selectedIds)
  return {
    sortedRows,
    searchedRows,
    totalPages,
    safePage,
    displayedRows,
    displayedIds,
    allSelected,
    someSelected,
  }
}
