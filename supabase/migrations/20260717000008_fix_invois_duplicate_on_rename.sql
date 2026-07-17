-- =============================================================================
-- Migration: fix_invois_duplicate_on_rename
-- push_invois_from_register upsert entri baru saat no_invois berubah (mis.
-- tool "perbaiki prefix"), tapi tidak pernah membersihkan entri lama di
-- tabel_invois — hasilnya nomor invois lama (tanpa prefix) tertinggal
-- selamanya berdampingan dengan nomor baru (ber-prefix), tampak sebagai
-- "duplikat" di register invois. Backfill sekali + hapus entri lama pada
-- setiap rename ke depannya.
-- =============================================================================

CREATE OR REPLACE FUNCTION push_invois_from_register()
RETURNS TRIGGER AS $$
DECLARE
  pembeli_changed boolean;
BEGIN
  IF COALESCE(NEW.no_invois, '') = '' THEN RETURN NEW; END IF;

  pembeli_changed := TG_OP = 'INSERT' OR NEW.pembeli IS DISTINCT FROM OLD.pembeli;

  IF TG_OP = 'UPDATE'
     AND NEW.no_invois IS NOT DISTINCT FROM OLD.no_invois
     AND NOT pembeli_changed
  THEN
    RETURN NEW;
  END IF;

  IF pembeli_changed AND COALESCE(NEW.pembeli, '') <> '' THEN
    INSERT INTO tabel_invois (tpk_id, no_invois, pembeli)
    VALUES (NEW.tpk_id, NEW.no_invois, NEW.pembeli)
    ON CONFLICT (tpk_id, no_invois)
    DO UPDATE SET pembeli = EXCLUDED.pembeli
    WHERE tabel_invois.pembeli IS DISTINCT FROM EXCLUDED.pembeli;
  ELSE
    INSERT INTO tabel_invois (tpk_id, no_invois, pembeli)
    VALUES (NEW.tpk_id, NEW.no_invois, NULLIF(NEW.pembeli, ''))
    ON CONFLICT (tpk_id, no_invois) DO NOTHING;
  END IF;

  -- no_invois berganti (rename/fix-prefix) → entri lama di tabel_invois yatim
  -- jika tak ada baris register lain se-tpk yang masih memakainya.
  IF TG_OP = 'UPDATE' AND NEW.no_invois IS DISTINCT FROM OLD.no_invois AND COALESCE(OLD.no_invois, '') <> '' THEN
    DELETE FROM tabel_invois
    WHERE tpk_id = OLD.tpk_id
      AND no_invois = OLD.no_invois
      AND NOT EXISTS (
        SELECT 1 FROM tabel_register_kapling
        WHERE tpk_id = OLD.tpk_id AND no_invois = OLD.no_invois
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bersihkan entri yatim yang sudah terlanjur ada: nomor invois tanpa prefix
-- yang (a) versi ber-prefixnya sudah ada di tabel_invois (bukti hasil rename)
-- dan (b) tak ada baris register manapun yang masih memakai nomor lama itu.
-- Tidak menyentuh entri manual berdiri sendiri (tanpa pasangan ber-prefix).
DELETE FROM tabel_invois ti
WHERE EXISTS (
  SELECT 1 FROM tabel_invois ti2
  WHERE ti2.tpk_id = ti.tpk_id
    AND ti2.no_invois IN ('ECR' || ti.no_invois, 'ECK' || ti.no_invois, 'EKK' || ti.no_invois)
)
AND NOT EXISTS (
  SELECT 1 FROM tabel_register_kapling rk
  WHERE rk.tpk_id = ti.tpk_id AND rk.no_invois = ti.no_invois
);
