-- Tabel DKHP SKSHHK — register dokumen pengangkutan hasil hutan kayu.
-- Tiap baris = 1 SKSHHK. no_dkhp adalah nomor urut buku register.
-- Akan dihubungkan ke tabel_register_kapling via kolom dkhp / skshhk
-- (sudah ada). Penyesuaian relasi menyusul.

create table if not exists tabel_dkhp_skshhk (
  id            uuid primary key default gen_random_uuid(),
  no_dkhp       text,
  tanggal       date,
  no_skshhk     text not null,
  klas          text,
  jenis         text,
  ai_bt         integer       default 0,
  ai_m3         numeric(12,3) default 0,
  aii_bt        integer       default 0,
  aii_m3        numeric(12,3) default 0,
  aiii_bt       integer       default 0,
  aiii_m3       numeric(12,3) default 0,
  jml_bt        integer       default 0,
  jml_m3        numeric(12,3) default 0,
  nopol         text,
  pemohon_sopir text,
  tujuan        text,
  kota_tujuan   text,
  pembeli       text,
  created_at    timestamptz default now()
);

create unique index if not exists tabel_dkhp_skshhk_no_skshhk_idx
  on tabel_dkhp_skshhk (no_skshhk);

create index if not exists tabel_dkhp_skshhk_tanggal_idx
  on tabel_dkhp_skshhk (tanggal);
