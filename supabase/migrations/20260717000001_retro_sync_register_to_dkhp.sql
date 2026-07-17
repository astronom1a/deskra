-- =============================================================================
-- Migration: retro_sync_register_to_dkhp
-- Sync retroaktif arah register_kapling → dkhp_skshhk (kebalikan dari trigger
-- trg_sync_dkhp_fields yang sudah ada). Dua perilaku baru saat user mengisi
-- manual di Register Kapling:
--
--   1. PULL — dkhp diisi/diubah: skshhk & pembeli langsung ditarik dari entri
--      menu DKHP SKSHHK bila entrinya ada. Nilai yang diketik user pada
--      statement yang sama tetap menang (tidak ditimpa master). Bila user
--      tidak mengetik skshhk, nilai lama ikut diganti/dikosongkan mengikuti
--      master karena skshhk lama milik nomor dkhp sebelumnya (stale).
--
--   2. PUSH — skshhk diisi/diubah manual pada baris yang punya dkhp:
--      no_skshhk di entri master ikut ter-update, dan trigger
--      trg_sync_dkhp_fields yang sudah ada otomatis meneruskannya ke kapling
--      lain ber-dkhp sama. Loop berhenti karena tiap trigger punya guard
--      "skip bila nilai tidak berubah".
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BAGIAN 1: PULL — isi skshhk/pembeli dari master saat dkhp diinput
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pull_dkhp_fields_from_master()
RETURNS TRIGGER AS $$
DECLARE
  master RECORD;
  user_typed_skshhk  boolean;
  user_typed_pembeli boolean;
BEGIN
  IF COALESCE(NEW.dkhp, '') = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.dkhp IS NOT DISTINCT FROM OLD.dkhp THEN RETURN NEW; END IF;

  SELECT no_skshhk, pembeli INTO master
  FROM   tabel_dkhp_skshhk
  WHERE  tpk_id = NEW.tpk_id AND no_dkhp = NEW.dkhp
  LIMIT  1;

  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Nilai dianggap "diketik user" bila non-kosong dan (pada UPDATE) berubah
  -- dari nilai lama — itu yang menang atas master.
  user_typed_skshhk  := COALESCE(NEW.skshhk, '') <> ''
                        AND (TG_OP = 'INSERT' OR NEW.skshhk IS DISTINCT FROM OLD.skshhk);
  user_typed_pembeli := COALESCE(NEW.pembeli, '') <> ''
                        AND (TG_OP = 'INSERT' OR NEW.pembeli IS DISTINCT FROM OLD.pembeli);

  IF NOT user_typed_skshhk THEN
    NEW.skshhk := master.no_skshhk;
  END IF;
  -- pembeli tidak dikosongkan bila master kosong — pembeli bisa berasal dari
  -- import invois yang tidak terkait dkhp.
  IF NOT user_typed_pembeli AND COALESCE(master.pembeli, '') <> '' THEN
    NEW.pembeli := master.pembeli;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pull_dkhp_fields ON tabel_register_kapling;

CREATE TRIGGER trg_pull_dkhp_fields
  BEFORE INSERT OR UPDATE OF dkhp ON tabel_register_kapling
  FOR EACH ROW
  EXECUTE FUNCTION pull_dkhp_fields_from_master();


-- -----------------------------------------------------------------------------
-- BAGIAN 2: PUSH — propagasi skshhk manual ke entri master DKHP SKSHHK
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION push_skshhk_to_dkhp_master()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.dkhp, '') = '' OR COALESCE(NEW.skshhk, '') = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.skshhk IS NOT DISTINCT FROM OLD.skshhk THEN RETURN NEW; END IF;

  UPDATE tabel_dkhp_skshhk
  SET    no_skshhk = NEW.skshhk
  WHERE  tpk_id = NEW.tpk_id
    AND  no_dkhp = NEW.dkhp
    AND  no_skshhk IS DISTINCT FROM NEW.skshhk;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_skshhk ON tabel_register_kapling;

CREATE TRIGGER trg_push_skshhk
  AFTER INSERT OR UPDATE OF skshhk ON tabel_register_kapling
  FOR EACH ROW
  EXECUTE FUNCTION push_skshhk_to_dkhp_master();


-- -----------------------------------------------------------------------------
-- BAGIAN 3: Backfill satu kali — register lama yang dkhp-nya sudah terisi tapi
-- skshhk/pembeli masih kosong padahal masternya punya nilai. Hanya mengisi
-- yang kosong, tidak menimpa data yang sudah ada.
-- -----------------------------------------------------------------------------

UPDATE tabel_register_kapling rk
SET    skshhk = d.no_skshhk
FROM   tabel_dkhp_skshhk d
WHERE  d.tpk_id = rk.tpk_id
  AND  d.no_dkhp = rk.dkhp
  AND  COALESCE(d.no_skshhk, '') <> ''
  AND  COALESCE(rk.skshhk, '') = '';

UPDATE tabel_register_kapling rk
SET    pembeli = d.pembeli
FROM   tabel_dkhp_skshhk d
WHERE  d.tpk_id = rk.tpk_id
  AND  d.no_dkhp = rk.dkhp
  AND  COALESCE(d.pembeli, '') <> ''
  AND  COALESCE(rk.pembeli, '') = '';
