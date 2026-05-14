-- Keep Register Kapling identity scoped to a TPK.
-- This supports same no_kapling values in different TPKs while preventing
-- duplicates inside one TPK.

create unique index if not exists uq_register_kapling_tpk_no_kapling
  on tabel_register_kapling (tpk_id, no_kapling)
  where no_kapling is not null and no_kapling <> '';
