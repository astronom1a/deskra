-- Enforce SKSHHK as a unique document number while still allowing
-- empty placeholder rows.
drop index if exists tabel_dkhp_skshhk_no_skshhk_lookup_idx;
drop index if exists tabel_dkhp_skshhk_no_skshhk_idx;

create unique index if not exists tabel_dkhp_skshhk_no_skshhk_idx
  on tabel_dkhp_skshhk (no_skshhk)
  where no_skshhk is not null and no_skshhk <> '';
