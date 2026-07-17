-- =============================================================================
-- Migration: clean_pembeli
-- Nama pembeli hasil import invois PDF tercemar seluruh teks invois (Email,
-- No KTP, NPWP, Alamat, detail transaksi) karena regex parser lama menangkap
-- semua teks setelah "Terima Dari :". Migrasi ini memotong nilai pembeli pada
-- penanda pertama sehingga hanya nama yang tersisa. Parser PDF sudah
-- diperbaiki di frontend (cleanPembeliName) agar import baru langsung bersih.
--
-- Urutan penting: tabel_invois dibersihkan lebih dulu — trigger
-- trg_sync_invois_pembeli otomatis menyebarkan nama bersih ke baris register
-- kapling se-invois. Update langsung ke register kapling hanya menangkap
-- sisa baris yang invoisnya tidak terdaftar. tabel_dkhp_skshhk ikut disapu
-- untuk jaga-jaga meski saat migrasi dibuat tidak ada baris kotor di sana.
-- =============================================================================

UPDATE tabel_invois
SET pembeli = btrim(regexp_replace(pembeli, '\s+(Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:.*$', '', 'i'))
WHERE pembeli ~* '\s+(Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:';

UPDATE tabel_register_kapling
SET pembeli = btrim(regexp_replace(pembeli, '\s+(Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:.*$', '', 'i'))
WHERE pembeli ~* '\s+(Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:';

UPDATE tabel_dkhp_skshhk
SET pembeli = btrim(regexp_replace(pembeli, '\s+(Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:.*$', '', 'i'))
WHERE pembeli ~* '\s+(Email|Type\s+Pembeli|No\s+KTP|NPWP|Alamat|Detail\s+Transaksi)\s*:';
