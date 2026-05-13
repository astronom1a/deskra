-- A SKSHHK number can appear in more than one DKHP row in the reference file.
-- Keep a lookup index, but remove the old uniqueness constraint.
drop index if exists tabel_dkhp_skshhk_no_skshhk_idx;

create index if not exists tabel_dkhp_skshhk_no_skshhk_lookup_idx
  on tabel_dkhp_skshhk (no_skshhk);
