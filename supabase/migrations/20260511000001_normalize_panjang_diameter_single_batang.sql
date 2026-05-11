-- Normalize panjang and diameter_tebal for records with batang <= 1.
-- Converts symmetric ranges like "1.10-1.10" → "1.10" and "28-28" → "28".

UPDATE tabel_register_kapling
SET panjang = split_part(panjang, '-', 1)
WHERE batang <= 1
  AND panjang LIKE '%-%'
  AND trim(split_part(panjang, '-', 1)) = trim(split_part(panjang, '-', 2))
  AND trim(split_part(panjang, '-', 1)) <> '';

UPDATE tabel_register_kapling
SET diameter_tebal = split_part(diameter_tebal, '-', 1)
WHERE batang <= 1
  AND diameter_tebal LIKE '%-%'
  AND trim(split_part(diameter_tebal, '-', 1)) = trim(split_part(diameter_tebal, '-', 2))
  AND trim(split_part(diameter_tebal, '-', 1)) <> '';
