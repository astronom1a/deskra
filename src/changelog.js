// Tambah entry baru di awal array setiap rilis
export const changelog = [
  {
    version: '0.47.0',
    date: '2026-07-16',
    items: [
      { type: 'feat', text: 'Register Kapling di mobile: tabel tampil default dengan scroll horizontal, toggle tabel/kartu untuk beralih ke tampilan card list' },
      { type: 'feat', text: 'empat tombol import (DP Kapling, DKHP, BAP, Invois) digabung jadi satu tombol import dengan menu pilihan' },
      { type: 'style', text: 'toolbar Register Kapling bisa wrap di layar sempit agar tidak overflow' },
    ]
  },
  {
    version: '0.46.1',
    date: '2026-07-16',
    items: [
      { type: 'chore', text: 'dev server Vite bind ke jaringan (host: true) agar bisa diakses dari HP untuk uji tampilan mobile' },
    ]
  },
  {
    version: '0.46.0',
    date: '2026-07-16',
    items: [
      { type: 'feat', text: 'DKHP/SKSHHK responsif: tabel jadi card list di mobile dengan badge klas/jenis, total m³, dan aksi Edit/QR/Hapus di tiap kartu' },
      { type: 'feat', text: 'filter & tampilan DKHP/SKSHHK di mobile lewat bottom sheet — filter tanggal, SKSHHK, kolom pencarian, ukuran halaman, dan pengurutan' },
      { type: 'style', text: 'modal cetak QR SKSHHK menyesuaikan layar sempit — preview QR dan form tersusun vertikal' },
    ]
  },
  {
    version: '0.45.0',
    date: '2026-07-16',
    items: [
      { type: 'feat', text: 'kit UI responsif bersama (useIsMobile, DataCard, BottomSheet, util class ds-*) sebagai fondasi tampilan mobile semua halaman' },
      { type: 'feat', text: 'Dashboard responsif: kartu jam horizontal di HP, kartu statistik menyesuaikan layar kecil, History Uang Kerja jadi card list di mobile' },
      { type: 'fix', text: 'halaman login di layar kecil: ornamen dekoratif dikecilkan & ditarik ke pojok agar tidak menimpa logo dan form, tinggi pakai 100dvh' },
    ]
  },
  {
    version: '0.44.3',
    date: '2026-07-15',
    items: [
      { type: 'style', text: 'font cetak halaman Main Link (Biaya TPK, Gabungan Pembayaran, Kwitansi, Permintaan UK) diganti ke Arial sans-serif agar konsisten formal dengan halaman cetak lainnya' },
      { type: 'style', text: 'cetak kwitansi: kolom nominal pada kotak Kode Rekening dan Rupiah dipersempit, pembagi kotak Telah Terima Dari / Kuitansi digeser ke kanan' },
      { type: 'style', text: 'cetak kwitansi: baris Banyaknya Uang diubah jadi teks tanpa kotak dengan nominal di kotak terpisah dari tabel di atasnya' },
    ]
  },
  {
    version: '0.44.2',
    date: '2026-07-15',
    items: [
      { type: 'fix', text: 'cetak QR SKSHHK: area cetak di-portal ke document.body agar tidak ikut terpengaruh layout/overflow container halaman utama' },
      { type: 'style', text: 'ukuran QR cetak diperbesar jadi 132mm (2/5 panjang kertas F4), logo & jarak elemen disesuaikan proporsional' },
      { type: 'style', text: 'default sort tabel DKHP/SKSHHK: urut Tanggal dulu baru DKHP' },
    ]
  },
  {
    version: '0.44.1',
    date: '2026-07-15',
    items: [
      { type: 'style', text: 'cetak kwitansi nota custom multi-item: kolom Vol mencantumkan satuan setelah jumlah fisik' },
      { type: 'style', text: 'tabel cetak nota custom multi-item disesuaikan tingginya agar serupa model kwitansi penomoran kapling' },
    ]
  },
  {
    version: '0.44.0',
    date: '2026-07-15',
    items: [
      { type: 'feat', text: 'Detail Pekerjaan: item custom dikelompokkan per Nota — satu kwitansi bisa memuat beberapa item sekaligus (kartu "Tambah Nota" / "Tambah Item ke Nota Ini")' },
      { type: 'feat', text: 'cetak kwitansi custom multi-item: tiap item dalam satu nota tercetak sebagai baris terpisah dengan total gabungan' },
    ]
  },
  {
    version: '0.43.1',
    date: '2026-07-13',
    items: [
      { type: 'style', text: 'cetak QR SKSHHK: ukuran kertas F4 satu halaman, QR & logo SVLK diperbesar proporsional, logo di-center antara batas atas kertas dan QR' },
      { type: 'fix', text: 'header/footer print browser tidak muncul karena margin halaman cetak QR 0 — margin dikembalikan agar ada ruang render' },
    ]
  },
  {
    version: '0.43.0',
    date: '2026-06-27',
    items: [
      { type: 'feat', text: 'mobile UI: sidebar jadi drawer dengan hamburger + backdrop pada layar ≤768px' },
      { type: 'feat', text: 'mobile top bar sticky dengan tombol buka drawer dan status realtime' },
      { type: 'style', text: 'metric cards Register Kapling: 5-col → 2-col (tablet) → 1-col (phone)' },
      { type: 'style', text: 'action buttons header Register Kapling wrap pada tablet' },
      { type: 'style', text: 'tinggi halaman Register Kapling disesuaikan untuk mobile top bar (calc 100vh - 48px)' },
    ]
  },
  {
    version: '0.42.0',
    date: '2026-06-27',
    items: [
      { type: 'feat', text: 'card persediaan pihak III di Register Kapling — kapling yang sudah ada invois tapi belum ber-SKSHHK' },
      { type: 'feat', text: 'filter tahun di Register Kapling — lintas periode dengan selector pill di header' },
      { type: 'feat', text: 'import BAP PDF dengan sync field (panjang, diameter, status, mutu, sortimen, batang, volume) dan preview verifikasi diff' },
      { type: 'feat', text: 'total akumulasi semua tahun di card Sisa Persediaan dan Persediaan Pihak III saat year filter aktif' },
      { type: 'feat', text: 'breakdown per sortimen di expand card Persediaan Pihak III' },
      { type: 'feat', text: 'periode aktif otomatis di sidebar (I/II per bulan berdasarkan tanggal)' },
      { type: 'fix', text: 'simplifyRange panjang dan diameter berlaku konsisten di BAP import dan tabel' },
    ]
  },
  {
    version: '0.41.0',
    date: '2026-05-26',
    items: [
      { type: 'feat', text: 'copy kredensial operator dan checklist onboarding di success screen pembuatan TPK' },
      { type: 'feat', text: 'auto-seed tumpuk kapling default saat periode baru dibuat' },
      { type: 'feat', text: 'empty state informatif di Dashboard dengan tombol langsung ke pembuatan periode' },
      { type: 'feat', text: 'badge kesiapan TPK di daftar admin untuk identifikasi TPK yang belum setup' },
    ]
  },
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
