// Tambah entry baru di awal array setiap rilis
export const changelog = [
  {
    version: '0.40.0',
    date: '2026-05-25',
    items: [
      { type: 'feat', text: 'retroactive sync pembeli DKHP → Register Kapling via DB trigger' },
      { type: 'feat', text: 'flag dkhp_conflict: kapling yang no. DKHP-nya pernah berubah otomatis ditandai ⚠️' },
      { type: 'feat', text: 'context menu Register Kapling: tombol "Tandai sudah diperiksa" untuk reset flag konflik DKHP' },
    ]
  },
  {
    version: '0.39.1',
    date: '2026-05-24',
    items: [
      { type: 'fix', text: 'sidebar collapsed: menu dengan sub-menu sekarang bisa diklik (expand sidebar + buka accordion)' },
    ]
  },
  {
    version: '0.39.0',
    date: '2026-05-24',
    items: [
      { type: 'feat', text: 'sidebar bisa di-collapse ke mode icon-only (56px) dengan transisi smooth' },
      { type: 'feat', text: 'state collapse sidebar persisten via localStorage' },
      { type: 'feat', text: 'tambah ikon Database pada menu Database di sidebar' },
    ]
  },
  {
    version: '0.38.3',
    date: '2026-05-24',
    items: [
      { type: 'feat', text: 'ganti semua dropdown native <select> dengan ThemedSelect di seluruh aplikasi' },
      { type: 'style', text: 'toolbar Kayu Bernomor: semua kontrol sejajar satu baris, custom dropdown "Semua Kolom" diganti ThemedSelect' },
      { type: 'style', text: 'toolbar Log Aktivitas: dibungkus container visual, filter sejajar satu baris' },
      { type: 'refactor', text: 'ThemedSelect: support width override via style prop' },
      { type: 'refactor', text: 'KayuBernomor: hapus showColDropdown state, colDropdownRef, dan useEffect click-outside yang tidak perlu' },
    ]
  },
  {
    version: '0.38.2',
    date: '2026-05-24',
    items: [
      { type: 'fix', text: 'parseAlamatLine: format "PT. Nama" tidak lagi terpotong jadi "PT"' },
      { type: 'fix', text: 'end_user tidak lagi memiliki trailing space saat kota kosong' },
      { type: 'fix', text: 'import Excel: sel angka/tanggal tidak dihitung sebagai baris gagal di-parse' },
      { type: 'fix', text: 'import Excel: hanya baca sheet pertama untuk hindari duplikat' },
      { type: 'fix', text: 'fetchData: ganti select(*) dengan kolom spesifik di tabel alamat bongkar' },
    ]
  },
  {
    version: '0.38.1',
    date: '2026-05-24',
    items: [
      { type: 'refactor', text: 'DkhpSkshhk: ekstrak SortIcon dan ActionButton untuk hapus IIFE di JSX dan duplikasi hover handler' },
      { type: 'style', text: 'DkhpSkshhk: tambah aria-label pada tombol aksi tabel (Edit, QR Code, Hapus)' },
    ]
  },
  {
    version: '0.38.0',
    date: '2026-05-24',
    items: [
      { type: 'feat', text: 'Import Excel alamat bongkar: preview popup dengan pagination 20 baris per halaman' },
      { type: 'feat', text: 'Preview import menampilkan baris yang gagal di-parse dalam seksi terpisah' },
      { type: 'feat', text: 'Audit trail lengkap: register kapling, pejabat, tenaga kerja, periode' },
      { type: 'feat', text: 'Hapus sistem tema — aplikasi selalu gelap' },
      { type: 'feat', text: 'Reset password via email di halaman Settings' },
      { type: 'feat', text: 'Export Excel register kapling dan rekap periode' },
    ]
  },
  {
    version: '0.37.0',
    date: '2026-05-23',
    items: [
      { type: 'feat', text: 'Tambah audit trail di database tenaga kerja (create/update/delete)' },
    ]
  },
  {
    version: '0.36.0',
    date: '2026-05-23',
    items: [
      { type: 'feat', text: 'Tambah database alamat bongkar/tujuan dengan halaman CRUD' },
      { type: 'feat', text: 'Dropdown pilih alamat tersimpan di form surat SKSHHK (autofill tujuan & kota)' },
      { type: 'feat', text: 'Dropdown pilih alamat tersimpan di modal QR (autofill end_user & alamat bongkar)' },
      { type: 'feat', text: 'Quick-save alamat dari form surat dan modal QR ke database' },
    ]
  },
  {
    version: '0.35.0',
    date: '2026-05-23',
    items: [
      { type: 'feat', text: 'Tambah fitur generate & cetak QR code per SKSHHK di halaman DKHP SKSHHK' },
      { type: 'feat', text: 'Modal preview QR dengan form edit (end user, alamat, masa aktif, penerbit)' },
      { type: 'feat', text: 'Layout cetak QR A5 dengan logo SVLK Indonesia' },
    ]
  },
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
