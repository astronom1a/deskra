-- ============================================================
-- DESKRA — Tarif Per Periode
-- Menggantikan tabel_tarif global dengan tarif yang
-- terikat pada periode tertentu (untuk history)
-- ============================================================

create table if not exists tabel_tarif_periode (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null references tabel_periode(id) on delete cascade,
  kode       text not null,       -- identifier unik (penomoran, sabuk, dll)
  kode_rek   text,
  uraian     text not null,
  satuan     text,
  tarif      numeric(12,2) not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (periode_id, kode)
);

create index if not exists idx_tarif_periode_periode on tabel_tarif_periode(periode_id);

drop trigger if exists trg_tarif_periode_updated on tabel_tarif_periode;
create trigger trg_tarif_periode_updated
  before update on tabel_tarif_periode
  for each row execute function set_updated_at();

-- ============================================================
-- Seed default 6 tarif untuk periode baru
-- ============================================================
create or replace function seed_tarif_periode(p_periode_id uuid)
returns void as $$
begin
  insert into tabel_tarif_periode (periode_id, kode, kode_rek, uraian, satuan, tarif) values
    (p_periode_id, 'penomoran', '51.69.43', 'PENOMORAN KAPLING',   'M3',  900),
    (p_periode_id, 'sabuk',     '51.69.43', 'SABUK KAPLING',       'M3',  400),
    (p_periode_id, 'tanda_laku','51.69.43', 'TANDA LAKU',          'M3',  750),
    (p_periode_id, 'slaghammer','51.69.43', 'SLAGHAMMER',          'M3',  3000),
    (p_periode_id, 'barcode',   '51.69.44', 'PEMASANGAN BARCODE',  'BTG', 350),
    (p_periode_id, 'brongkol',  '51.69.44', 'TUMPUK BRONGKOL',     'SM',  7000)
  on conflict (periode_id, kode) do nothing;
end;
$$ language plpgsql;
