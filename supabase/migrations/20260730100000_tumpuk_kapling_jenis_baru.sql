-- ============================================================
-- DESKRA — Tumpuk Kapling: tambah jenis baru
-- Johar, Klampis, Rimba Campuran
-- File ini HANYA berisi ALTER TYPE ADD VALUE — jangan tambah
-- statement lain di sini (lihat catatan di migration berikutnya).
-- ============================================================

alter type jenis_kapling add value if not exists 'JOHAR';
alter type jenis_kapling add value if not exists 'KLAMPIS';
alter type jenis_kapling add value if not exists 'RIMBA_CAMPURAN';
