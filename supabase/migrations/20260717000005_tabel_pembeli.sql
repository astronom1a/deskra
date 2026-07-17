-- =============================================================================
-- Migration: tabel_pembeli
-- Master pembeli per nomor akun (3-5 digit pertama nomor invois). Hanya
-- menyimpan akun + nama — email/KTP/NPWP/alamat sengaja tidak disimpan.
-- Tidak ada trigger DB: nomor akun hanya bisa diturunkan dari nomor invois
-- lewat parseInvois (logika JS, tidak diduplikasi ke SQL); keterkaitan
-- akun ↔ invois ditangani frontend halaman Register Invois.
-- =============================================================================

create table if not exists tabel_pembeli (
  id         uuid primary key default gen_random_uuid(),
  tpk_id     uuid not null references tabel_tpk(id),
  akun       text not null,
  pembeli    text not null,
  created_at timestamptz default now()
);

create unique index if not exists tabel_pembeli_tpk_akun_idx
  on tabel_pembeli (tpk_id, akun);

alter table tabel_pembeli enable row level security;

drop policy if exists rls_tabel_pembeli_all on tabel_pembeli;
create policy rls_tabel_pembeli_all on tabel_pembeli
  for all
  using ((tpk_id = my_tpk_id()) or is_admin())
  with check ((tpk_id = my_tpk_id()) or is_admin());
