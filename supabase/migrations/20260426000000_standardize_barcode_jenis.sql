-- Standardisasi value `jenis` di tabel_pemasangan_barcode
-- Dari nilai lama yang inconsistent → JATI / MAHONI / KEDAWUNG
-- Idempotent: aman dijalankan berkali-kali.

update tabel_pemasangan_barcode
set jenis = case
  when upper(trim(jenis)) in ('JATI', 'JATI/RIMBA', 'JATI / RIMBA', 'RIMBA JATI', 'JATI RIMBA') then 'JATI'
  when upper(trim(jenis)) in ('MAHONI', 'RIMBA MAHONI', 'RIMBA / MAHONI', 'RIMBA (MAHONI)') then 'MAHONI'
  when upper(trim(jenis)) in ('KEDAWUNG', 'RIMBA KEDAWUNG', 'RIMBA / KEDAWUNG', 'RIMBA (KEDAWUNG)') then 'KEDAWUNG'
  else upper(trim(jenis))
end
where jenis is not null;
