-- Add DKHP & SKSHHK reference columns to tabel_register_kapling.
-- Both are free-text references that will later be linked to the DKHP SKSHHK
-- menu (per-document numbering). Nullable: kapling boleh belum punya dokumen.

create table if not exists tabel_register_kapling (
  id              uuid default gen_random_uuid() primary key,
  no_kapling      text not null,
  tgl_kapling     date,
  periode         text,
  no_blok         text,
  jenis           text,
  sortimen        text,
  panjang         text,
  diameter_tebal  text,
  status          text,
  mutu            text,
  cacat           text,
  sertifikasi     text,
  batang          integer not null default 0,
  volume          numeric(12,3) not null default 0,
  no_invois       text,
  pembeli         text,
  file_name       text,
  created_at      timestamptz default now()
);

create index if not exists idx_register_kapling_no_kapling
  on tabel_register_kapling(no_kapling);

alter table tabel_register_kapling
  add column if not exists dkhp   text,
  add column if not exists skshhk text;
