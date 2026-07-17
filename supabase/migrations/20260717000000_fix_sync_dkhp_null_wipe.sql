-- =============================================================================
-- Migration: fix_sync_dkhp_null_wipe
-- Perbaikan sync_dkhp_fields_to_register_kapling. Pola lama
-- `NEW.x IS DISTINCT FROM COALESCE(OLD.x, '')` salah saat NEW.x NULL karena
-- NULL selalu dianggap "berubah" terhadap '' — dan pada INSERT, OLD dievaluasi
-- NULL sehingga jalurnya sama. Akibatnya:
--   * INSERT entri DKHP baru dengan no_skshhk/pembeli kosong (import Excel,
--     placeholder) MENGHAPUS skshhk & pembeli yang sudah terisi di register.
--   * UPDATE pembeli pada DKHP yang no_skshhk-nya NULL ikut me-reset skshhk
--     register jadi NULL.
-- Sekarang kondisi propagasi sadar-TG_OP: INSERT hanya mempropagasi nilai
-- non-null, UPDATE hanya kolom yang benar-benar berubah.
-- =============================================================================

CREATE OR REPLACE FUNCTION sync_dkhp_fields_to_register_kapling()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip bila tidak ada nilai yang perlu dipropagasi.
  IF TG_OP = 'INSERT'
     AND NEW.no_skshhk IS NULL
     AND NEW.pembeli   IS NULL
  THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.no_skshhk IS NOT DISTINCT FROM OLD.no_skshhk
     AND NEW.pembeli    IS NOT DISTINCT FROM OLD.pembeli
  THEN
    RETURN NEW;
  END IF;

  UPDATE tabel_register_kapling
  SET
    skshhk  = CASE
                WHEN (TG_OP = 'INSERT' AND NEW.no_skshhk IS NOT NULL)
                  OR (TG_OP = 'UPDATE' AND NEW.no_skshhk IS DISTINCT FROM OLD.no_skshhk)
                THEN NEW.no_skshhk
                ELSE skshhk
              END,
    pembeli = CASE
                WHEN (TG_OP = 'INSERT' AND NEW.pembeli IS NOT NULL)
                  OR (TG_OP = 'UPDATE' AND NEW.pembeli IS DISTINCT FROM OLD.pembeli)
                THEN NEW.pembeli
                ELSE pembeli
              END
  WHERE  tpk_id = NEW.tpk_id
    AND  dkhp   = NEW.no_dkhp
    AND  (
      (
        ((TG_OP = 'INSERT' AND NEW.no_skshhk IS NOT NULL)
          OR (TG_OP = 'UPDATE' AND NEW.no_skshhk IS DISTINCT FROM OLD.no_skshhk))
        AND skshhk IS DISTINCT FROM NEW.no_skshhk
      )
      OR
      (
        ((TG_OP = 'INSERT' AND NEW.pembeli IS NOT NULL)
          OR (TG_OP = 'UPDATE' AND NEW.pembeli IS DISTINCT FROM OLD.pembeli))
        AND pembeli IS DISTINCT FROM NEW.pembeli
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
