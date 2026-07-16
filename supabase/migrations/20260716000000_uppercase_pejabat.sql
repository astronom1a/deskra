-- Uppercase data pejabat yang sudah tersimpan (nama & npk),
-- menyusul perubahan input form yang kini selalu uppercase.
update tabel_pejabat
set nama = upper(nama),
    npk  = upper(npk)
where nama is distinct from upper(nama)
   or npk  is distinct from upper(npk);
