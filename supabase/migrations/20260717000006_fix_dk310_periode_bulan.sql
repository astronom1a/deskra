-- =============================================================================
-- Migration: fix_dk310_periode_bulan
-- Bug: periode DK310 (tabel_dk310_periods.periode) di-parse cuma sebagai
-- "I-2026"/"II-2026" (romawi + tahun), padahal periode I/II adalah pembagian
-- DALAM satu bulan (I = tgl 1-15, II = tgl 16-akhir). Akibatnya import bulan
-- berbeda dalam semester yang sama numpuk di periode string yang sama, dan
-- cek "sudah pernah diimport" (.maybeSingle()) error saat >1 baris cocok.
-- Fix: backfill periode dari masa_pembayaran (yang sudah menyimpan info
-- bulan) jadi format "ROMAWI-BULAN-TAHUN", lalu kunci keunikannya di DB.
-- =============================================================================

update tabel_dk310_periods
set periode = (regexp_match(masa_pembayaran, '^([IVXLC]+)\s*[-–]\s*(\S+)\s*(\d{4})'))[1]
  || '-' || (regexp_match(masa_pembayaran, '^([IVXLC]+)\s*[-–]\s*(\S+)\s*(\d{4})'))[2]
  || '-' || (regexp_match(masa_pembayaran, '^([IVXLC]+)\s*[-–]\s*(\S+)\s*(\d{4})'))[3]
where masa_pembayaran ~ '^([IVXLC]+)\s*[-–]\s*(\S+)\s*(\d{4})';

create unique index if not exists tabel_dk310_periods_tpk_jenis_periode_idx
  on tabel_dk310_periods (tpk_id, jenis, periode);
