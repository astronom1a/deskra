import Toast from '../../components/ui/Toast'
import TpkRequiredState from '../../components/layout/TpkRequiredState'
import { COLS, DEFAULT_COL_MAP, FIELD_DEFS, PAGE_SIZES } from './utils/registerKaplingConstants'
import RegisterKaplingBatchEditModal from './modals/RegisterKaplingBatchEditModal.jsx'
import RegisterKaplingContextMenu from './components/RegisterKaplingContextMenu.jsx'
import RegisterKaplingDeleteModal from './modals/RegisterKaplingDeleteModal.jsx'
import RegisterKaplingDkhpImportPreview from './modals/RegisterKaplingDkhpImportPreview.jsx'
import RegisterKaplingDkhpModal from './modals/RegisterKaplingDkhpModal.jsx'
import RegisterKaplingEditModal from './modals/RegisterKaplingEditModal.jsx'
import RegisterKaplingExcelImportPreview from './modals/RegisterKaplingExcelImportPreview.jsx'
import RegisterKaplingFixPrefixModal from './modals/RegisterKaplingFixPrefixModal.jsx'
import RegisterKaplingHeader from './components/RegisterKaplingHeader.jsx'
import RegisterKaplingInvoicePreview from './modals/RegisterKaplingInvoicePreview.jsx'
import RegisterKaplingQuickInvoisModal from './modals/RegisterKaplingQuickInvoisModal.jsx'
import RegisterKaplingMetricCards from './components/RegisterKaplingMetricCards.jsx'
import RegisterKaplingSettingsModal from './modals/RegisterKaplingSettingsModal.jsx'
import RegisterKaplingSortPanel from './components/RegisterKaplingSortPanel.jsx'
import RegisterKaplingStyles from './components/RegisterKaplingStyles.jsx'
import RegisterKaplingTable from './components/RegisterKaplingTable.jsx'
import RegisterKaplingToolbar from './components/RegisterKaplingToolbar.jsx'
import { INVOIS_PREFIX_MAP } from './utils/registerKaplingConstants'
import { useRegisterKaplingPage } from './hooks/useRegisterKaplingPage'

export default function RegisterKapling() {
  const page = useRegisterKaplingPage()

  if (!page.tpkId) return <TpkRequiredState />

  return (
    <div style={{ padding: 24, height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0a0a0a', color: '#f0f0f0' }}>
      <RegisterKaplingStyles />
      <Toast toast={page.toast} />

      <RegisterKaplingHeader
        colMap={page.colMap}
        dkhpImportRef={page.dkhpImportRef}
        fileRef={page.fileRef}
        invoisRef={page.invoisRef}
        onDkhpImportFiles={page.handleDkhpImportFiles}
        onExport={page.handleExport}
        onFileChange={page.handleFileChange}
        onInvoisFileChange={page.handleInvoisFileChange}
        onAddRow={() => page.setEditRow({ ...page.EMPTY_ROW })}
        onOpenFixPrefix={page.handleOpenFixPrefix}
        realtimeStatus={page.realtimeStatus}
        rows={page.rows}
        setDraftMap={page.setDraftMap}
        setShowSettings={page.setShowSettings}
      />

      {page.rows.length > 0 && (
        <RegisterKaplingMetricCards
          blokBreakdown={page.blokBreakdown}
          expandedCard={page.expandedCard}
          kaplingInfo={page.kaplingInfo}
          missingInvoices={page.missingInvoices}
          penguranganInvoices={page.penguranganInvoices}
          setExpandedCard={page.setExpandedCard}
          soldSortVolume={page.soldSortVolume}
          sortBatang={page.sortBatang}
          sortVolume={page.sortVolume}
          totalBatang={page.totalBatang}
          totalMissingCount={page.totalMissingCount}
          totalVolume={page.totalVolume}
          unsoldBatang={page.unsoldBatang}
          unsoldSortBatang={page.unsoldSortBatang}
          unsoldSortVolume={page.unsoldSortVolume}
          unsoldVolume={page.unsoldVolume}
        />
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {page.showSettings && (
        <RegisterKaplingSettingsModal
          draftMap={page.draftMap}
          excelHeaders={page.excelHeaders}
          fieldDefs={FIELD_DEFS}
          onCancel={() => page.setShowSettings(false)}
          onChangeField={(key, value) => page.setDraftMap(prev => ({ ...prev, [key]: value }))}
          onResetDefault={() => page.setDraftMap({ ...DEFAULT_COL_MAP })}
          onSave={() => { page.saveColMap(page.draftMap); page.setShowSettings(false); page.showToast('Pengaturan disimpan') }}
        />
      )}

      {page.preview && (
        <RegisterKaplingExcelImportPreview
          importing={page.importing}
          onCancel={() => page.setPreview(null)}
          onConfirm={page.handleImport}
          onModeChange={mode => page.setPreview(current => ({ ...current, mode }))}
          preview={page.preview}
        />
      )}

      {page.invoisPreview && (
        <RegisterKaplingInvoicePreview
          isSaving={page.invoisSaving}
          onCancel={() => page.setInvoisPreview(null)}
          onSave={page.handleInvoisSave}
          preview={page.invoisPreview}
        />
      )}

      {page.showFixPrefix && (
        <RegisterKaplingFixPrefixModal
          entries={Object.values(page.fixPrefixMap)}
          invoicePrefixMap={INVOIS_PREFIX_MAP}
          isSaving={page.fixPrefixSaving}
          onApply={page.handleApplyFixPrefix}
          onCancel={() => page.setShowFixPrefix(false)}
        />
      )}

      {page.editRow && (
        <RegisterKaplingEditModal
          invoicePrefixMap={INVOIS_PREFIX_MAP}
          isSaving={page.editSaving}
          onCancel={() => page.setEditRow(null)}
          onChange={(key, value) => page.setEditRow(prev => ({ ...prev, [key]: value }))}
          onNumberStep={page.handleEditNumberStep}
          onSave={page.handleEditSave}
          row={page.editRow}
        />
      )}

      {page.deleteRow && (
        <RegisterKaplingDeleteModal
          isDeleting={page.deleting}
          mode="single"
          noKapling={page.deleteRow.no_kapling}
          onCancel={() => page.setDeleteRow(null)}
          onConfirm={page.handleDelete}
        />
      )}

      {page.showBatchDelete && (
        <RegisterKaplingDeleteModal
          count={page.selectedIds.size}
          isDeleting={page.batchDeleting}
          mode="batch"
          onCancel={() => page.setShowBatchDelete(false)}
          onConfirm={page.handleBatchDelete}
        />
      )}

      {page.showBatchEdit && (
        <RegisterKaplingBatchEditModal
          data={page.batchEditData}
          isSaving={page.batchEditSaving}
          onCancel={() => page.setShowBatchEdit(false)}
          onChange={(key, value) => page.setBatchEditData(prev => ({ ...prev, [key]: value }))}
          onSubmit={page.handleBatchEdit}
          selectedCount={page.selectedIds.size}
        />
      )}

      {page.showSortPanel && (
        <RegisterKaplingSortPanel
          columns={COLS}
          draftSorts={page.draftSorts}
          onAddSort={() => {
            const used = new Set(page.draftSorts.map(s => s.key))
            const next = COLS.find(c => !used.has(c.key))?.key || COLS[0].key
            page.setDraftSorts(prev => [...prev, { key: next, dir: 'asc' }])
          }}
          onApply={() => { page.setSorts(page.draftSorts); page.setCurrentPage(1); page.setShowSortPanel(false) }}
          onCancel={() => page.setShowSortPanel(false)}
          onChangeSortKey={(i, next) => page.setDraftSorts(prev => prev.map((s, si) => si === i ? { ...s, key: next } : s))}
          onRemoveSort={i => page.setDraftSorts(prev => prev.filter((_, si) => si !== i))}
          onReset={() => { page.setDraftSorts([]); page.setSorts([]); page.setCurrentPage(1); page.setShowSortPanel(false) }}
          onToggleSortDir={i => page.setDraftSorts(prev => prev.map((s, si) => si === i ? { ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' } : s))}
        />
      )}

      {page.invoisRow && (
        <RegisterKaplingQuickInvoisModal
          isSaving={page.invoisSavingQuick}
          noInvois={page.invoisInput.no_invois}
          onCancel={() => page.setInvoisRow(null)}
          onChange={(key, value) => page.setInvoisInput(prev => ({ ...prev, [key]: value }))}
          onSave={page.handleSaveQuickInvois}
          pembeli={page.invoisInput.pembeli}
          row={page.invoisRow}
        />
      )}

      {page.dkhpImportPreview && (
        <RegisterKaplingDkhpImportPreview
          isSaving={page.dkhpImportSaving}
          onCancel={() => page.setDkhpImportPreview(null)}
          onSave={page.handleDkhpImportSave}
          preview={page.dkhpImportPreview}
        />
      )}

      {page.showDkhpModal && (
        <RegisterKaplingDkhpModal
          conflicts={page.dkhpConflicts}
          input={page.dkhpInput}
          isSaving={page.dkhpSaving}
          onCancel={() => page.setShowDkhpModal(false)}
          onChangeInput={page.setDkhpInput}
          onCheck={page.handleCheckDkhp}
          onSave={page.handleSaveDkhp}
          rows={page.dkhpModalRows}
          step={page.dkhpStep}
        />
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <RegisterKaplingToolbar
        columns={COLS}
        colDropdownRef={page.colDropdownRef}
        currentPage={page.currentPage}
        displayedCount={page.displayedRows.length}
        onBatchDelete={() => page.setShowBatchDelete(true)}
        onBatchEdit={() => { page.setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' }); page.setShowBatchEdit(true) }}
        onClearSearch={() => page.setSearchTerm('')}
        onOpenSortPanel={() => { page.setDraftSorts([...page.sorts]); page.setShowSortPanel(true) }}
        onPageNext={() => page.setCurrentPage(p => Math.min(page.totalPages, p + 1))}
        onPagePrev={() => page.setCurrentPage(p => Math.max(1, p - 1))}
        onSearchChange={page.setSearchTerm}
        onSearchColChange={key => { page.setSearchCol(key); page.setShowColDropdown(false) }}
        onSetPageSize={value => { page.setPageSize(value); page.setCurrentPage(1) }}
        onToggleColDropdown={() => page.setShowColDropdown(v => !v)}
        pageSize={page.pageSize}
        pageSizes={PAGE_SIZES}
        rowsCount={page.rows.length}
        safePage={page.safePage}
        searchCol={page.searchCol}
        searchTerm={page.searchTerm}
        searchedCount={page.searchedRows.length}
        selectedCount={page.selectedIds.size}
        showColDropdown={page.showColDropdown}
        sorts={page.sorts}
        totalPages={page.totalPages}
      />

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <RegisterKaplingTable
        allSelected={page.allSelected}
        columns={COLS}
        displayedRows={page.displayedRows}
        filteredBatang={page.filteredBatang}
        filteredVolume={page.filteredVolume}
        isEmpty={page.rows.length === 0}
        isLoading={page.loading}
        onDeleteRow={page.setDeleteRow}
        onEditRow={page.setEditRow}
        onOpenContextMenu={(e, row) => { e.preventDefault(); page.setContextMenu({ x: e.clientX, y: e.clientY, row }) }}
        onOpenDkhpModal={page.handleOpenDkhpModal}
        onOpenInvoisModal={page.handleOpenInvoisModal}
        onToggleSelectAll={page.toggleSelectAll}
        onToggleSelectRow={page.toggleSelectRow}
        onToggleSort={page.toggleSort}
        pageSize={page.pageSize}
        safePage={page.safePage}
        selectAllRef={page.selectAllRef}
        selectedIds={page.selectedIds}
        someSelected={page.someSelected}
        sorts={page.sorts}
      />

      {/* ── Context menu ────────────────────────────────────────────────────── */}
      {page.contextMenu && (
        <RegisterKaplingContextMenu
          isBatch={page.selectedIds.size > 1 && page.selectedIds.has(page.contextMenu.row.id)}
          menu={page.contextMenu}
          onDelete={() => {
            if (page.selectedIds.size > 1 && page.selectedIds.has(page.contextMenu.row.id)) {
              page.setShowBatchDelete(true)
            } else {
              page.setDeleteRow(page.contextMenu.row)
            }
            page.setContextMenu(null)
          }}
          onClearConflict={() => page.handleClearDkhpConflict(page.contextMenu.row)}
          onEdit={() => {
            if (page.selectedIds.size > 1 && page.selectedIds.has(page.contextMenu.row.id)) {
              page.setBatchEditData({ tgl_kapling: '', periode: '', no_blok: '', sertifikasi: '' })
              page.setShowBatchEdit(true)
            } else {
              page.setEditRow({ ...page.contextMenu.row })
            }
            page.setContextMenu(null)
          }}
          selectedCount={page.selectedIds.size}
        />
      )}
    </div>
  )
}
