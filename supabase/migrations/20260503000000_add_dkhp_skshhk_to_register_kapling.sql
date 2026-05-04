-- Add DKHP & SKSHHK reference columns to tabel_register_kapling.
-- Both are free-text references that will later be linked to the DKHP SKSHHK
-- menu (per-document numbering). Nullable: kapling boleh belum punya dokumen.

alter table tabel_register_kapling
  add column if not exists dkhp   text,
  add column if not exists skshhk text;
