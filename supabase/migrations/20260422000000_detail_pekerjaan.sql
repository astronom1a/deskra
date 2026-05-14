-- ============================================================
-- DESKRA — Detail Pekerjaan
-- Tanda Laku, Tumpuk Brongkol, Pemasangan Barcode (per jenis pohon)
-- Tenaga Bantu, Kebersihan (auto periode II), Listrik (periode I), Custom
-- ============================================================

-- 1. Tanda Laku (per jenis pohon, multi-row)
create table if not exists tabel_tanda_laku (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null references tabel_periode(id) on delete cascade,
  jenis      text not null,
  volume     numeric(12,3) not null default 0,
  tarif      numeric(12,2) not null default 750,
  urutan     int default 0,
  created_at timestamp with time zone default now()
);
create index if not exists idx_tanda_laku_periode on tabel_tanda_laku(periode_id);

-- 2. Tumpuk Brongkol (per jenis pohon, multi-row)
create table if not exists tabel_tumpuk_brongkol (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null references tabel_periode(id) on delete cascade,
  jenis      text not null,
  volume     numeric(12,3) not null default 0,
  tarif      numeric(12,2) not null default 7000,
  urutan     int default 0,
  created_at timestamp with time zone default now()
);
create index if not exists idx_tumpuk_brongkol_periode on tabel_tumpuk_brongkol(periode_id);

-- 3. Pemasangan Barcode (per jenis pohon, multi-row)
create table if not exists tabel_pemasangan_barcode (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null references tabel_periode(id) on delete cascade,
  jenis      text not null,
  jumlah     numeric(12,2) not null default 0,
  tarif      numeric(12,2) not null default 350,
  urutan     int default 0,
  created_at timestamp with time zone default now()
);
create index if not exists idx_pemasangan_barcode_periode on tabel_pemasangan_barcode(periode_id);

-- 4. Tenaga Bantu (1 baris per periode, jumlah orang adjustable, hanya periode II)
create table if not exists tabel_tenaga_bantu (
  id              uuid default gen_random_uuid() primary key,
  periode_id      uuid not null unique references tabel_periode(id) on delete cascade,
  jumlah_orang    int not null default 6,
  tarif_per_orang numeric(12,2) not null default 750000,
  created_at      timestamp with time zone default now()
);

-- 5. Kebersihan (auto-isi hanya di periode II, 1 baris per periode)
create table if not exists tabel_kebersihan (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null unique references tabel_periode(id) on delete cascade,
  nominal    numeric(12,2) not null default 52000,
  created_at timestamp with time zone default now()
);

-- 6. Listrik (hanya dapat diisi di periode I, 1 baris per periode)
create table if not exists tabel_listrik (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null unique references tabel_periode(id) on delete cascade,
  nominal    numeric(12,2) not null default 0,
  no_meter   text,
  created_at timestamp with time zone default now()
);

-- 7. Custom Items (fleksibel, multi-row per periode)
create table if not exists tabel_custom_item (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid not null references tabel_periode(id) on delete cascade,
  label      text not null,
  satuan     text,
  fisik      numeric(12,3) not null default 0,
  tarif      numeric(12,2) not null default 0,
  urutan     int default 0,
  created_at timestamp with time zone default now()
);
create index if not exists idx_custom_item_periode on tabel_custom_item(periode_id);

-- ============================================================
-- Helper: ambil "half" (I / II) dari label periode
-- contoh: 'I/4 / 2026' -> 'I' ; 'II/7 / 2026' -> 'II'
-- ============================================================
create or replace function periode_half(p_periode_id uuid)
returns text as $$
  select case when periode like 'II/%' then 'II' else 'I' end
  from tabel_periode where id = p_periode_id;
$$ language sql stable;

-- ============================================================
-- Helper seed: auto-buat baris Kebersihan kalau periode II
-- ============================================================
create or replace function seed_kebersihan_if_periode_2(p_periode_id uuid)
returns void as $$
declare
  v_tpk_id uuid;
begin
  if periode_half(p_periode_id) = 'II' then
    select tpk_id into v_tpk_id from tabel_periode where id = p_periode_id;

    insert into tabel_kebersihan (periode_id, tpk_id, nominal)
    values (p_periode_id, v_tpk_id, 52000)
    on conflict (periode_id) do nothing;
  end if;
end;
$$ language plpgsql;
