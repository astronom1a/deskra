-- ============================================================
-- DESKRA - Master Tenaga Kerja (Tenaga Bantu / Tenaga Kapling)
-- ============================================================

create table if not exists tabel_tenaga_kerja (
  id         uuid default gen_random_uuid() primary key,
  nama       text not null,
  nik        text,
  alamat     text,
  posisi     text not null check (posisi in ('TENAGA_BANTU', 'TENAGA_KAPLING')),
  aktif      boolean not null default true,
  created_at timestamp with time zone default now()
);

create index if not exists idx_tenaga_kerja_posisi on tabel_tenaga_kerja(posisi);
create index if not exists idx_tenaga_kerja_aktif on tabel_tenaga_kerja(aktif);
create unique index if not exists uq_tenaga_kerja_nik on tabel_tenaga_kerja(nik) where nik is not null and nik <> '';
