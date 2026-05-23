-- Tabel database alamat bongkar/tujuan — menyimpan alamat yang sering digunakan
-- per TPK untuk autofill di form surat SKSHHK dan modal QR.

create table if not exists tabel_alamat_bongkar (
  id             uuid primary key default gen_random_uuid(),
  tpk_id         uuid not null,
  label          text not null,
  end_user       text,
  alamat_lengkap text,
  kota           text,
  created_at     timestamptz default now()
);

create index if not exists tabel_alamat_bongkar_tpk_id_idx
  on tabel_alamat_bongkar (tpk_id);

alter table tabel_alamat_bongkar enable row level security;

drop policy if exists "rls_tabel_alamat_bongkar_all" on tabel_alamat_bongkar;
create policy "rls_tabel_alamat_bongkar_all" on tabel_alamat_bongkar for all
  using (tpk_id = my_tpk_id() or is_admin())
  with check (tpk_id = my_tpk_id() or is_admin());
