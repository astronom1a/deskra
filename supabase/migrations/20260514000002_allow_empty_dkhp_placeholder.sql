-- Allow empty placeholder DKHP rows for numbers that exist in sequence
-- but have no SKSHHK/detail data in the reference file.
alter table tabel_dkhp_skshhk
  alter column no_skshhk drop not null;
