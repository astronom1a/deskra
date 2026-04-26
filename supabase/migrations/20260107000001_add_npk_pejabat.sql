-- ============================================================
-- DESKRA — Migration: Tambah kolom NPK pada tabel_pejabat
-- ============================================================

alter table tabel_pejabat
  add column if not exists npk text;
