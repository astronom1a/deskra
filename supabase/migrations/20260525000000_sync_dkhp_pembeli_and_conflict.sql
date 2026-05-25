-- =============================================================================
-- Migration: sync_dkhp_pembeli_and_conflict
-- Menggantikan trigger lama yang hanya sync no_skshhk, sekarang juga sync
-- pembeli agar register_kapling selalu mencerminkan data terbaru dari
-- tabel_dkhp_skshhk tanpa perlu update manual dua tabel secara bersamaan.
-- Juga menambahkan flag dkhp_conflict agar bisa dideteksi saat nomor DKHP
-- di register_kapling diganti dari satu nilai aktif ke nilai lain (bukan
-- sekadar diisi dari null), yang biasanya menandakan kesalahan penginputan.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BAGIAN 1: Ganti trigger lama dengan function baru yang sync KEDUANYA
-- Trigger lama hanya memperhatikan no_skshhk; penambahan sync pembeli
-- diperlukan karena UI DkhpSkshhk sudah mengizinkan edit kolom pembeli
-- dan perubahan itu harus terpropagasi ke register_kapling secara otomatis.
-- -----------------------------------------------------------------------------

-- Hapus function lama beserta trigger yang menggantungkan padanya
DROP FUNCTION IF EXISTS sync_skshhk_to_register_kapling() CASCADE;

-- Function baru: sync no_skshhk DAN pembeli ke register_kapling
CREATE OR REPLACE FUNCTION sync_dkhp_fields_to_register_kapling()
RETURNS TRIGGER AS $$
BEGIN
  -- Pada UPDATE: skip jika tidak ada yang berubah di kedua kolom yang
  -- relevan, untuk menghindari write yang tidak perlu ke tabel lain.
  IF TG_OP = 'UPDATE'
     AND NEW.no_skshhk IS NOT DISTINCT FROM OLD.no_skshhk
     AND NEW.pembeli    IS NOT DISTINCT FROM OLD.pembeli
  THEN
    RETURN NEW;
  END IF;

  UPDATE tabel_register_kapling
  SET
    skshhk  = CASE
                WHEN NEW.no_skshhk IS DISTINCT FROM COALESCE(OLD.no_skshhk, '')
                THEN NEW.no_skshhk
                ELSE skshhk
              END,
    pembeli = CASE
                WHEN NEW.pembeli IS DISTINCT FROM COALESCE(OLD.pembeli, '')
                THEN NEW.pembeli
                ELSE pembeli
              END
  WHERE  tpk_id = NEW.tpk_id
    AND  dkhp   = NEW.no_dkhp
    AND  (
      skshhk  IS DISTINCT FROM NEW.no_skshhk
      OR pembeli IS DISTINCT FROM NEW.pembeli
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bersihkan kedua nama trigger (lama dan baru) sebelum CREATE agar
-- migration aman dijalankan berulang (idempoten).
DROP TRIGGER IF EXISTS trg_sync_skshhk      ON tabel_dkhp_skshhk;
DROP TRIGGER IF EXISTS trg_sync_dkhp_fields ON tabel_dkhp_skshhk;

CREATE TRIGGER trg_sync_dkhp_fields
  AFTER INSERT OR UPDATE OF no_skshhk, pembeli ON tabel_dkhp_skshhk
  FOR EACH ROW
  EXECUTE FUNCTION sync_dkhp_fields_to_register_kapling();


-- -----------------------------------------------------------------------------
-- BAGIAN 2: Tambah kolom dkhp_conflict ke tabel_register_kapling
-- Kolom ini dibutuhkan untuk menandai kapling yang nomor DKHP-nya pernah
-- diganti setelah terisi, sehingga operator dapat mereview dan memvalidasi
-- data yang berpotensi salah input tanpa menghapus history.
-- -----------------------------------------------------------------------------

ALTER TABLE tabel_register_kapling
  ADD COLUMN IF NOT EXISTS dkhp_conflict boolean DEFAULT false;


-- -----------------------------------------------------------------------------
-- BAGIAN 3: Trigger flag konflik — deteksi penggantian nomor DKHP aktif
-- Hanya update dari nilai non-null ke nilai non-null yang berbeda yang
-- dianggap konflik; pengisian pertama (null → nilai) adalah operasi normal
-- dan tidak perlu diflag.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION flag_dkhp_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.dkhp IS NOT NULL
     AND NEW.dkhp IS NOT NULL
     AND OLD.dkhp IS DISTINCT FROM NEW.dkhp
  THEN
    NEW.dkhp_conflict := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flag_dkhp_conflict ON tabel_register_kapling;

CREATE TRIGGER trg_flag_dkhp_conflict
  BEFORE UPDATE OF dkhp ON tabel_register_kapling
  FOR EACH ROW
  EXECUTE FUNCTION flag_dkhp_conflict();
