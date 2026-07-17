-- =============================================================================
-- Migration: dk310_invois_skip
-- "Invois Terlewat" di Register Kapling membandingkan invois pengurangan
-- DK310 vs no_invois yang terinput di kapling. Untuk invois dari periode
-- sebelum aplikasi dipakai (kapling-nya memang tidak pernah diinput), invois
-- ini akan selamanya kehitung "terlewat" walau bukan kesalahan input. Tabel
-- ini menyimpan invois yang ditandai manual "tidak berlaku" (di luar
-- cakupan data) supaya bisa dikecualikan dari daftar/hitungan.
-- =============================================================================

create table if not exists tabel_dk310_invois_skip (
  id         uuid primary key default gen_random_uuid(),
  tpk_id     uuid not null references tabel_tpk(id),
  no_invois  text not null,
  keterangan text,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create unique index if not exists tabel_dk310_invois_skip_tpk_invois_idx
  on tabel_dk310_invois_skip (tpk_id, no_invois);

alter table tabel_dk310_invois_skip enable row level security;

drop policy if exists rls_tabel_dk310_invois_skip_all on tabel_dk310_invois_skip;
create policy rls_tabel_dk310_invois_skip_all on tabel_dk310_invois_skip
  for all
  using ((tpk_id = my_tpk_id()) or is_admin())
  with check ((tpk_id = my_tpk_id()) or is_admin());
