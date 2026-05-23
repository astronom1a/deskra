-- Trigger: sync no_skshhk dari tabel_dkhp_skshhk ke tabel_register_kapling secara retroaktif.
--
-- Kenapa trigger, bukan logika di frontend:
--   Bekerja di semua jalur update (UI, import, direct SQL), atomic, tanpa round-trip tambahan.
--
-- Kapan trigger ini jalan:
--   AFTER INSERT → DKHP baru dibuat dengan no_skshhk → semua kapling yang sudah punya dkhp itu langsung ter-update
--   AFTER UPDATE OF no_skshhk → operator mengisi/mengubah SKSHHK → kapling lama yang tertinggal ikut ter-update

CREATE OR REPLACE FUNCTION sync_skshhk_to_register_kapling()
RETURNS TRIGGER AS $$
BEGIN
  -- Pada UPDATE: skip jika no_skshhk tidak berubah
  IF TG_OP = 'UPDATE' AND NEW.no_skshhk IS NOT DISTINCT FROM OLD.no_skshhk THEN
    RETURN NEW;
  END IF;

  UPDATE tabel_register_kapling
  SET    skshhk = NEW.no_skshhk
  WHERE  tpk_id = NEW.tpk_id
    AND  dkhp   = NEW.no_dkhp
    AND  skshhk IS DISTINCT FROM NEW.no_skshhk;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_skshhk ON tabel_dkhp_skshhk;

CREATE TRIGGER trg_sync_skshhk
  AFTER INSERT OR UPDATE OF no_skshhk ON tabel_dkhp_skshhk
  FOR EACH ROW
  EXECUTE FUNCTION sync_skshhk_to_register_kapling();
