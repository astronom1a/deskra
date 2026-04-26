-- ============================================================
-- DESKRA — Initial Migration
-- Membuat semua tabel dasar aplikasi
-- ============================================================

-- Tabel Pejabat
create table if not exists tabel_pejabat (
  id         uuid default gen_random_uuid() primary key,
  nama       text not null,
  npk        text,
  jabatan    text not null,
  aktif      boolean default true,
  created_at timestamp with time zone default now()
);

-- Tabel Tarif
create table if not exists tabel_tarif (
  id         uuid default gen_random_uuid() primary key,
  kode_rek   text,
  uraian     text not null,
  satuan     text,
  tarif      numeric not null,
  aktif      boolean default true,
  created_at timestamp with time zone default now()
);

-- Tabel Periode
create table if not exists tabel_periode (
  id         uuid default gen_random_uuid() primary key,
  periode    text not null unique,
  tgl_awal   date,
  tgl_akhir  date,
  total_uk   numeric default 0,
  status     text default 'aktif',
  created_at timestamp with time zone default now()
);

-- Tabel Pekerjaan (Main Link)
create table if not exists tabel_pekerjaan (
  id         uuid default gen_random_uuid() primary key,
  periode_id uuid references tabel_periode(id) on delete cascade,
  no         integer,
  kode_rek   text,
  uraian     text,
  satuan     text,
  fisik      numeric default 0,
  tarif      numeric default 0,
  created_at timestamp with time zone default now()
);

-- Index untuk performa query
create index if not exists idx_pekerjaan_periode on tabel_pekerjaan(periode_id);
create index if not exists idx_pejabat_aktif on tabel_pejabat(aktif);
create index if not exists idx_tarif_aktif on tabel_tarif(aktif);
