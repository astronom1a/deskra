-- =============================================================================
-- Migration: register_kapling_skip
-- Import invois di Register Kapling mencocokkan no_kapling dari PDF terhadap
-- data yang sudah terdaftar. Untuk kapling dari periode sebelum aplikasi
-- dipakai (memang tidak pernah/tidak akan diinput), nomor itu akan selamanya
-- kehitung "tidak ada di register". Tabel ini menyimpan no_kapling yang
-- ditandai manual "di luar cakupan data" supaya bisa dikecualikan dari
-- daftar tindak lanjut, mengikuti pola tabel_dk310_invois_skip.
-- =============================================================================

create table if not exists tabel_register_kapling_skip (
  id         uuid primary key default gen_random_uuid(),
  tpk_id     uuid not null references tabel_tpk(id),
  no_kapling text not null,
  keterangan text,
  created_at timestamptz default now(),
  created_by uuid references profiles(id)
);

create unique index if not exists tabel_register_kapling_skip_tpk_kapling_idx
  on tabel_register_kapling_skip (tpk_id, no_kapling);

alter table tabel_register_kapling_skip enable row level security;

drop policy if exists rls_tabel_register_kapling_skip_all on tabel_register_kapling_skip;
create policy rls_tabel_register_kapling_skip_all on tabel_register_kapling_skip
  for all
  using ((tpk_id = my_tpk_id()) or is_admin())
  with check ((tpk_id = my_tpk_id()) or is_admin());
