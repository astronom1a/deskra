-- =============================================================================
-- Migration: pembeli_prefer_invoice
-- Acuan utama kolom pembeli di register_kapling adalah INPUT INVOIS, bukan
-- entri DKHP SKSHHK — satu dkhp bisa memuat lebih dari satu pembeli (banyak
-- invois), sedangkan entri DKHP hanya menyimpan satu nama. Sebelumnya sync
-- dkhp → register menimpa pembeli SEMUA kapling ber-dkhp sama dengan satu
-- nama itu, menghapus nama pembeli per-invois yang benar.
--
-- Perilaku baru untuk pembeli (skshhk tidak berubah — tetap dua arah penuh):
--   * dkhp → register : pembeli master hanya MENGISI kapling yang pembelinya
--     masih kosong; tidak pernah menimpa dan tidak pernah mengosongkan.
--   * input dkhp di register : pembeli master hanya mengisi bila kolom
--     pembeli baris itu kosong.
--   * tidak ada push pembeli register → dkhp, karena satu dkhp bisa punya
--     banyak pembeli — tidak jelas nama mana yang mewakili.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BAGIAN 1: sync dkhp → register — pembeli hanya mengisi yang kosong
-- -----------------------------------------------------------------------------

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
                WHEN ((TG_OP = 'INSERT' AND NEW.pembeli IS NOT NULL)
                       OR (TG_OP = 'UPDATE' AND NEW.pembeli IS DISTINCT FROM OLD.pembeli))
                  AND COALESCE(pembeli, '') = ''
                  AND COALESCE(NEW.pembeli, '') <> ''
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
        AND COALESCE(pembeli, '') = ''
        AND COALESCE(NEW.pembeli, '') <> ''
      )
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- -----------------------------------------------------------------------------
-- BAGIAN 2: pull saat input dkhp di register — pembeli hanya bila kosong
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pull_dkhp_fields_from_master()
RETURNS TRIGGER AS $$
DECLARE
  master RECORD;
  user_typed_skshhk boolean;
BEGIN
  IF COALESCE(NEW.dkhp, '') = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.dkhp IS NOT DISTINCT FROM OLD.dkhp THEN RETURN NEW; END IF;

  SELECT no_skshhk, pembeli INTO master
  FROM   tabel_dkhp_skshhk
  WHERE  tpk_id = NEW.tpk_id AND no_dkhp = NEW.dkhp
  LIMIT  1;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- SKSHHK yang diketik user pada statement yang sama menang atas master.
  user_typed_skshhk := COALESCE(NEW.skshhk, '') <> ''
                       AND (TG_OP = 'INSERT' OR NEW.skshhk IS DISTINCT FROM OLD.skshhk);

  IF NOT user_typed_skshhk THEN
    NEW.skshhk := master.no_skshhk;
  END IF;

  -- Pembeli: acuan utama input invois — master hanya mengisi bila kosong.
  IF COALESCE(NEW.pembeli, '') = '' AND COALESCE(master.pembeli, '') <> '' THEN
    NEW.pembeli := master.pembeli;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
