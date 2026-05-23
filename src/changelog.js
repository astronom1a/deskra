// Tambah entry baru di awal array setiap rilis
export const changelog = [
  {
    version: '0.34.4',
    date: '2026-05-22',
    items: [
      { type: 'feat', text: 'Tambah tombol invois per baris di tabel Register Kapling — buka modal kecil untuk input No. Invois & Pembeli, otomatis tertutup setelah simpan' },
    ]
  },
  {
    version: '0.34.3',
    date: '2026-05-22',
    items: [
      { type: 'feat', text: 'SKSHHK otomatis ter-update di Register Kapling saat no_skshhk diisi/diubah di DKHP SKSHHK (retroactive via DB trigger)' },
    ]
  },
  {
    version: '0.34.2',
    date: '2026-05-20',
    items: [
      { type: 'fix',   text: 'Total kapling card menampilkan 0 (tambah properti `total` ke `analyzeKapling`)' },
      { type: 'feat',  text: 'Tambah logo Perhutani di header cetak kwitansi' },
      { type: 'style', text: 'Hapus garis horizontal antar baris tabel kwitansi, pertahankan garis vertikal' },
      { type: 'style', text: 'Tambah border atas baris Jumlah Rp. di tabel kwitansi' },
      { type: 'style', text: 'Perlebar box total hijau di bawah tabel kwitansi' },
    ]
  },
  {
    version: '0.34.1',
    date: '2026-05-20',
    items: [
      { type: 'fix', text: 'Rapikan tampilan cetak dan dashboard' },
    ]
  },
  {
    version: '0.34.0',
    date: '2026-05-20',
    items: [
      { type: 'refactor', text: 'Restrukturisasi folder src/ menjadi feature-based' },
    ]
  },
  {
    version: '0.33.0',
    date: '2026-05-20',
    items: [
      { type: 'fix', text: 'Dashboard: fetch stats paralel & bounded query' },
      { type: 'fix', text: 'Dashboard: error handling pada fetchStats' },
      { type: 'fix', text: 'Dashboard: history UK tidak dipengaruhi card expand' },
    ]
  },
  {
    version: '0.32.0',
    items: [
      { type: 'feat', text: 'Register Kapling dipecah jadi komponen modular' },
      { type: 'feat', text: 'Komponen LoadingState untuk semua halaman' },
      { type: 'feat', text: 'Notifikasi update versi di halaman login' },
      { type: 'feat', text: 'Dashboard & KayuBernomor diperbarui' },
      { type: 'fix',  text: 'Berbagai perbaikan UI dan performa' },
    ]
  },
  {
    version: '0.31.0',
    items: [
      { type: 'feat', text: 'Import DKHP dari Excel (.xlsx)' },
      { type: 'feat', text: 'Register Kapling: sort panel & batch edit' },
      { type: 'feat', text: 'Invoice preview & fix prefix modal' },
      { type: 'fix',  text: 'Parser DK310 & DKHP' },
    ]
  },
]

export const latestChangelog = changelog[0]
