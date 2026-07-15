-- ============================================================
-- DESKRA — Custom Item grouping
-- Memungkinkan satu kwitansi/nota terdiri dari beberapa item custom
-- (item dengan group_id sama akan dicetak sebagai satu kwitansi).
-- Item lama tanpa group_id tetap dianggap nota tersendiri (fallback: group_id = id).
-- ============================================================

alter table tabel_custom_item
  add column if not exists group_id uuid;

create index if not exists idx_custom_item_group on tabel_custom_item(group_id);
