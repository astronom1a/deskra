// Tambah entry baru di awal array setiap rilis
export const changelog = [
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
