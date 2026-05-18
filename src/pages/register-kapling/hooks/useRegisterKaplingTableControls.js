import { useEffect, useState } from 'react'

export function getNextRegisterKaplingSorts(sorts, key) {
  if (sorts[0]?.key === key) {
    const newDir = sorts[0].dir === 'asc' ? 'desc' : 'asc'
    return [{ key, dir: newDir }, ...sorts.slice(1)]
  }
  return [{ key, dir: 'asc' }]
}

export function getNextRegisterKaplingSelection({
  allSelected,
  displayedIds,
  rowId,
  selectedIds,
}) {
  const next = new Set(selectedIds)
  if (rowId !== undefined) {
    next.has(rowId) ? next.delete(rowId) : next.add(rowId)
    return next
  }

  if (allSelected) displayedIds.forEach(id => next.delete(id))
  else displayedIds.forEach(id => next.add(id))
  return next
}

export function useRegisterKaplingTableControls() {
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  const [sorts, setSorts] = useState([])
  const [showSortPanel, setShowSortPanel] = useState(false)
  const [draftSorts, setDraftSorts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchCol, setSearchCol] = useState('all')
  const [showColDropdown, setShowColDropdown] = useState(false)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, searchCol])

  function toggleSort(key) {
    setSorts(prev => getNextRegisterKaplingSorts(prev, key))
    setCurrentPage(1)
  }

  return {
    currentPage,
    draftSorts,
    pageSize,
    searchCol,
    searchTerm,
    setCurrentPage,
    setDraftSorts,
    setPageSize,
    setSearchCol,
    setSearchTerm,
    setShowColDropdown,
    setShowSortPanel,
    setSorts,
    showColDropdown,
    showSortPanel,
    sorts,
    toggleSort,
  }
}
