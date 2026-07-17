-- =============================================================================
-- Migration: register_invois
-- Tabel master invois → pembeli. Nomor invois memuat pattern
-- [akun 3-5 digit][YYMMDD][jam 4-5 digit] yang diparse di frontend; DB hanya
-- menyimpan no_invois + pembeli agar logika parse tidak terduplikasi.
--
-- Invois adalah acuan utama pembeli di register_kapling, jadi:
--   * tabel_invois → register : pembeli entri invois MENIMPA pembeli kapling
--     ber-invois sama (kebalikan aturan dkhp yang hanya mengisi kosong).
--   * register → tabel_invois : setiap no_invois yang muncul di register
--     otomatis terdaftar; pembeli yang diketik manual di register ikut
--     memperbarui entri invois (lalu tersebar ke kapling lain se-invois).
--   * input no_invois di register menarik pembeli dari entri invois bila
--     user tidak mengetik pembeli sendiri di statement yang sama.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- BAGIAN 1: Tabel + RLS (pola sama dengan tabel operasional lain)
-- -----------------------------------------------------------------------------

create table if not exists tabel_invois (
  id         uuid primary key default gen_random_uuid(),
  tpk_id     uuid not null references tabel_tpk(id),
  no_invois  text not null,
  pembeli    text,
  created_at timestamptz default now()
);

create unique index if not exists tabel_invois_tpk_no_invois_idx
  on tabel_invois (tpk_id, no_invois);

alter table tabel_invois enable row level security;

drop policy if exists rls_tabel_invois_all on tabel_invois;
create policy rls_tabel_invois_all on tabel_invois
  for all
  using ((tpk_id = my_tpk_id()) or is_admin())
  with check ((tpk_id = my_tpk_id()) or is_admin());


-- -----------------------------------------------------------------------------
-- BAGIAN 2: tabel_invois → register_kapling
-- Pembeli entri invois menimpa pembeli kapling ber-invois sama — invois
-- adalah sumber kebenaran pembeli. Pembeli kosong tidak dipropagasi
-- (tidak pernah mengosongkan data register).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_invois_pembeli_to_register()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(NEW.pembeli, '') = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE'
     AND NEW.pembeli   IS NOT DISTINCT FROM OLD.pembeli
     AND NEW.no_invois IS NOT DISTINCT FROM OLD.no_invois
  THEN
    RETURN NEW;
  END IF;

  UPDATE tabel_register_kapling
  SET    pembeli = NEW.pembeli
  WHERE  tpk_id    = NEW.tpk_id
    AND  no_invois = NEW.no_invois
    AND  pembeli IS DISTINCT FROM NEW.pembeli;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_invois_pembeli ON tabel_invois;

CREATE TRIGGER trg_sync_invois_pembeli
  AFTER INSERT OR UPDATE OF pembeli, no_invois ON tabel_invois
  FOR EACH ROW
  EXECUTE FUNCTION sync_invois_pembeli_to_register();


-- -----------------------------------------------------------------------------
-- BAGIAN 3: PULL — input no_invois di register menarik pembeli dari entri
-- invois. Pembeli yang diketik user pada statement yang sama menang.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION pull_invois_pembeli_from_master()
RETURNS TRIGGER AS $$
DECLARE
  master_pembeli text;
  user_typed_pembeli boolean;
BEGIN
  IF COALESCE(NEW.no_invois, '') = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.no_invois IS NOT DISTINCT FROM OLD.no_invois THEN RETURN NEW; END IF;

  SELECT pembeli INTO master_pembeli
  FROM   tabel_invois
  WHERE  tpk_id = NEW.tpk_id AND no_invois = NEW.no_invois
  LIMIT  1;

  IF NOT FOUND OR COALESCE(master_pembeli, '') = '' THEN RETURN NEW; END IF;

  user_typed_pembeli := COALESCE(NEW.pembeli, '') <> ''
                        AND (TG_OP = 'INSERT' OR NEW.pembeli IS DISTINCT FROM OLD.pembeli);

  IF NOT user_typed_pembeli THEN
    NEW.pembeli := master_pembeli;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pull_invois_pembeli ON tabel_register_kapling;

CREATE TRIGGER trg_pull_invois_pembeli
  BEFORE INSERT OR UPDATE OF no_invois ON tabel_register_kapling
  FOR EACH ROW
  EXECUTE FUNCTION pull_invois_pembeli_from_master();


-- -----------------------------------------------------------------------------
-- BAGIAN 4: PUSH — no_invois di register otomatis terdaftar di tabel_invois;
-- pembeli yang berubah di register ikut memperbarui entri invois (lalu
-- trigger BAGIAN 2 menyebarkannya ke kapling lain se-invois).
-- -----------------------------------------------------------------------------

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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_push_invois ON tabel_register_kapling;

CREATE TRIGGER trg_push_invois
  AFTER INSERT OR UPDATE OF no_invois, pembeli ON tabel_register_kapling
  FOR EACH ROW
  EXECUTE FUNCTION push_invois_from_register();


-- -----------------------------------------------------------------------------
-- BAGIAN 5: Backfill — invois yang sudah ada di register kapling
-- -----------------------------------------------------------------------------

INSERT INTO tabel_invois (tpk_id, no_invois, pembeli)
SELECT tpk_id, no_invois, max(NULLIF(pembeli, ''))
FROM   tabel_register_kapling
WHERE  COALESCE(no_invois, '') <> ''
GROUP  BY tpk_id, no_invois
ON CONFLICT (tpk_id, no_invois) DO NOTHING;
