-- Tambah kolom sort_untuk, lebar, asal_kayu ke tabel_register_kapling
-- sesuai header referensi DP Kapling

ALTER TABLE tabel_register_kapling
  ADD COLUMN IF NOT EXISTS sort_untuk text,
  ADD COLUMN IF NOT EXISTS lebar      text,
  ADD COLUMN IF NOT EXISTS asal_kayu  text;
