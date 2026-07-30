-- ============================================================
-- DESKRA — Tumpuk Kapling: Slaghammer jadi checklist per jenis
-- JATI & RIMBA_MAHONI selalu ikut (fix), jenis lain opsional
-- per periode via checkbox di UI (default: tidak ikut).
-- ============================================================

alter table tabel_tumpuk_kapling
  add column if not exists ikut_slaghammer boolean not null default false;

-- Backfill data lama: JATI & RIMBA_MAHONI otomatis ikut Slaghammer
-- (perilaku sama seperti sebelum perubahan ini).
update tabel_tumpuk_kapling set ikut_slaghammer = true
  where jenis in ('JATI', 'RIMBA_MAHONI');

-- View v_slaghammer sekarang baca kolom ikut_slaghammer, bukan
-- filter jenis hardcode — otomatis benar untuk jenis apa pun.
create or replace view v_slaghammer
with (security_invoker = true) as
select
  periode_id,
  sum(volume)            as fisik,
  3000::numeric          as tarif,
  sum(volume) * 3000     as nilai
from tabel_tumpuk_kapling
where ikut_slaghammer = true
group by periode_id;

-- seed_tumpuk_kapling(): insert eksplisit kolom ikut_slaghammer
-- supaya JATI & RIMBA_MAHONI tetap true, RIMBA_KEDAWUNG false —
-- perilaku "Generate Default" (9 baris) tidak berubah.
create or replace function seed_tumpuk_kapling(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

  insert into tabel_tumpuk_kapling (periode_id, tpk_id, jenis, sortimen, volume, tarif, ikut_slaghammer) values
    (p_periode_id, v_tpk_id, 'JATI',           'AI',   0, 19000, true),
    (p_periode_id, v_tpk_id, 'JATI',           'AII',  0, 21500, true),
    (p_periode_id, v_tpk_id, 'JATI',           'AIII', 0, 24800, true),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AI',   0, 19000, true),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AII',  0, 21500, true),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AIII', 0, 24800, true),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AI',   0, 19000, false),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AII',  0, 21500, false),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AIII', 0, 24800, false)
  on conflict (periode_id, jenis, sortimen) do nothing;
end;
$$ language plpgsql;
