-- ============================================================
-- DESKRA — Tumpuk Kapling
-- Input per sortimen (9 baris/periode: 3 jenis × 3 sortimen)
-- Auto-menghitung: Penomoran Kapling, Sabuk Kapling, Slaghammer
-- ============================================================

-- Enum jenis & sortimen
do $$ begin
  create type jenis_kapling as enum ('JATI', 'RIMBA_MAHONI', 'RIMBA_KEDAWUNG');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sortimen_kapling as enum ('AI', 'AII', 'AIII');
exception when duplicate_object then null; end $$;

-- Tabel input Tumpuk Kapling (9 baris unik per periode)
create table if not exists tabel_tumpuk_kapling (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null references tabel_periode(id) on delete cascade,
  jenis      jenis_kapling not null,
  sortimen   sortimen_kapling not null,
  volume     numeric(12,3) not null default 0,  -- M3 (fisik)
  tarif      numeric(12,2) not null,            -- default: AI=19000, AII=21500, AIII=24800
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (periode_id, jenis, sortimen)
);

create index if not exists idx_tumpuk_kapling_periode on tabel_tumpuk_kapling(periode_id);

-- Trigger auto-update updated_at
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tumpuk_kapling_updated on tabel_tumpuk_kapling;
create trigger trg_tumpuk_kapling_updated
  before update on tabel_tumpuk_kapling
  for each row execute function set_updated_at();

-- ============================================================
-- Views turunan (otomatis dari tumpuk kapling)
-- ============================================================

-- Total tumpuk kapling per jenis per periode
create or replace view v_tumpuk_kapling_per_jenis
with (security_invoker = true) as
select
  periode_id,
  jenis,
  sum(volume)            as total_volume,
  sum(volume * tarif)    as total_nilai
from tabel_tumpuk_kapling
group by periode_id, jenis;

-- Penomoran Kapling: volume = SUM semua jenis, tarif 900
create or replace view v_penomoran_kapling
with (security_invoker = true) as
select
  periode_id,
  sum(volume)            as fisik,
  900::numeric           as tarif,
  sum(volume) * 900      as nilai
from tabel_tumpuk_kapling
group by periode_id;

-- Sabuk Kapling: volume = sama dengan Penomoran Kapling, tarif 400
create or replace view v_sabuk_kapling
with (security_invoker = true) as
select
  periode_id,
  sum(volume)            as fisik,
  400::numeric           as tarif,
  sum(volume) * 400      as nilai
from tabel_tumpuk_kapling
group by periode_id;

-- Slaghammer: volume = JATI + RIMBA_MAHONI saja (tidak termasuk KEDAWUNG), tarif 3000
create or replace view v_slaghammer
with (security_invoker = true) as
select
  periode_id,
  sum(volume)            as fisik,
  3000::numeric          as tarif,
  sum(volume) * 3000     as nilai
from tabel_tumpuk_kapling
where jenis in ('JATI', 'RIMBA_MAHONI')
group by periode_id;

-- ============================================================
-- Helper: seed 9 baris kosong untuk periode baru
-- Panggil: select seed_tumpuk_kapling('<periode_id>');
-- ============================================================
create or replace function seed_tumpuk_kapling(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

  insert into tabel_tumpuk_kapling (periode_id, tpk_id, jenis, sortimen, volume, tarif) values
    (p_periode_id, v_tpk_id, 'JATI',           'AI',   0, 19000),
    (p_periode_id, v_tpk_id, 'JATI',           'AII',  0, 21500),
    (p_periode_id, v_tpk_id, 'JATI',           'AIII', 0, 24800),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AI',   0, 19000),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AII',  0, 21500),
    (p_periode_id, v_tpk_id, 'RIMBA_MAHONI',   'AIII', 0, 24800),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AI',   0, 19000),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AII',  0, 21500),
    (p_periode_id, v_tpk_id, 'RIMBA_KEDAWUNG', 'AIII', 0, 24800)
  on conflict (periode_id, jenis, sortimen) do nothing;
end;
$$ language plpgsql;
