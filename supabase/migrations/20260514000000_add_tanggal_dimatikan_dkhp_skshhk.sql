-- Add SKSHHK destination completion date.
alter table tabel_dkhp_skshhk
  add column if not exists tanggal_dimatikan date;

create index if not exists tabel_dkhp_skshhk_tanggal_dimatikan_idx
  on tabel_dkhp_skshhk (tanggal_dimatikan);
