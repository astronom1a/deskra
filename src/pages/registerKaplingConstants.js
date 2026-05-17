export const FIELD_DEFS = [
  { key: 'no_kapling',     label: 'No. Kapling',    required: true },
  { key: 'tgl_kapling',    label: 'Tgl Kapling' },
  { key: 'periode',        label: 'Periode' },
  { key: 'no_blok',        label: 'No Blok' },
  { key: 'jenis',          label: 'Jenis Kayu' },
  { key: 'sortimen',       label: 'Sortimen' },
  { key: 'sort_untuk',     label: 'Sort. Untuk' },
  { key: 'panjang',        label: 'Panjang' },
  { key: 'lebar',          label: 'Lebar' },
  { key: 'diameter_tebal', label: 'Diameter/<br>Tebal' },
  { key: 'status',         label: 'Status' },
  { key: 'mutu',           label: 'Mutu' },
  { key: 'cacat',          label: 'Cacat Kayu' },
  { key: 'asal_kayu',      label: 'Asal Kayu' },
  { key: 'sertifikasi',    label: 'Sert.' },
  { key: 'batang',         label: 'Jumlah', num: true },
  { key: 'volume',         label: 'Volume (M³)', num: true },
  { key: 'dkhp',           label: 'DKHP' },
  { key: 'skshhk',         label: 'SKSHHK' },
]

export const DEFAULT_COL_MAP = {
  no_kapling:     'No. Kapling',
  tgl_kapling:    'Tgl Kapling',
  periode:        'Periode',
  no_blok:        'No Blok',
  jenis:          'Jenis Kayu',
  sortimen:       'Sortimen',
  sort_untuk:     'Sort. Untuk',
  panjang:        'Panjang',
  lebar:          'Lebar',
  diameter_tebal: 'Diameter/<br>Tebal',
  status:         'Status',
  mutu:           'Mutu',
  cacat:          'Cacat Kayu',
  asal_kayu:      'Asal Kayu',
  sertifikasi:    'Sert.',
  batang:         'Jumlah',
  volume:         'Volume',
  dkhp:           'DKHP',
  skshhk:         'SKSHHK',
}

export const COL_MAP_STORAGE_KEY = 'deskra_kapling_col_map'
export const EXCEL_HEADERS_STORAGE_KEY = 'deskra_kapling_excel_headers'

export const COLS = [
  { key: 'no_kapling',     label: 'No. Kapling',   w: 'w-[128px]' },
  { key: 'tgl_kapling',    label: 'Tgl Kapling',   w: 'w-[88px]'  },
  { key: 'periode',        label: 'Periode',        w: 'w-[54px]'  },
  { key: 'no_blok',        label: 'No Blok',        w: 'w-[80px]'  },
  { key: 'jenis',          label: 'Jenis Kayu',     w: 'w-[70px]'  },
  { key: 'sortimen',       label: 'Sortimen',       w: 'w-[62px]'  },
  { key: 'panjang',        label: 'Panjang',        w: 'w-[72px]'  },
  { key: 'diameter_tebal', label: 'Dia/Tebal',      w: 'w-[72px]'  },
  { key: 'mutu_label',     label: 'Mutu',           w: 'w-[72px]'  },
  { key: 'sertifikasi',    label: 'Sert.',          w: 'w-[54px]'  },
  { key: 'batang',         label: 'Jumlah',         w: 'w-[50px]',  num: true },
  { key: 'volume',         label: 'Volume',         w: 'w-[64px]',  num: true },
  { key: 'no_invois',      label: 'Invois',         w: 'w-[130px]' },
  { key: 'pembeli',        label: 'Pembeli',        w: 'w-[140px]' },
  { key: 'dkhp',           label: 'DKHP',           w: 'w-[110px]' },
  { key: 'skshhk',         label: 'SKSHHK',         w: 'w-[130px]' },
]

export const PAGE_SIZES = [
  { label: '10',    value: 10 },
  { label: '20',    value: 20 },
  { label: '50',    value: 50 },
  { label: '100',   value: 100 },
  { label: '500',   value: 500 },
  { label: '1.000', value: 1000 },
  { label: 'Semua', value: 0 },
]

export const SORTIMENS = ['AI', 'AII', 'AIII']
