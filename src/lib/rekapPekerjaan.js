import { supabase } from './supabase'

export const DEFAULT_TARIF_PERIODE = {
  penomoran: 900, sabuk: 400, tanda_laku: 750, slaghammer: 3000, barcode: 350, brongkol: 7000,
  tumpuk_ai: 19000, tumpuk_aii: 21500, tumpuk_aiii: 24800,
}

// Mapping sortimen → kode tarif periode untuk Tumpuk Kapling.
export const TUMPUK_TARIF_KODE = { AI: 'tumpuk_ai', AII: 'tumpuk_aii', AIII: 'tumpuk_aiii' }

export function parseHalf(p) { return p?.startsWith('II/') ? 'II' : 'I' }

export function applyNumbers(rows) {
  let counter = 0
  return rows.map(r => {
    if (r._noMode === 'none') return { ...r, no: '-' }
    const nilai = (r.fisik||0) * (r.tarif||0)
    const eligible = r._noMode === 'group' ? r._groupValue > 0 : nilai > 0
    return { ...r, no: eligible ? ++counter : '-' }
  })
}

// Bangun rekap baris pekerjaan untuk satu periode — sumber tunggal
// dipakai oleh Main Link & Dashboard.
function scoped(query, tpkId) {
  return tpkId ? query.eq('tpk_id', tpkId) : query
}

export async function buildRows(periodeId, periodeLabel, options = {}) {
  const { tpkId } = options
  const half = parseHalf(periodeLabel)
  const isPeriodeII = half === 'II'
  const isPeriodeI  = half === 'I'

  const [
    { data: tumpuk },
    { data: tandaLaku },
    { data: brongkol },
    { data: barcode },
    { data: tenaga },
    { data: kebersihan },
    { data: listrik },
    { data: custom },
    { data: tarifDb },
  ] = await Promise.all([
    scoped(supabase.from('tabel_tumpuk_kapling').select('*').eq('periode_id', periodeId), tpkId),
    scoped(supabase.from('tabel_tanda_laku').select('*').eq('periode_id', periodeId), tpkId),
    scoped(supabase.from('tabel_tumpuk_brongkol').select('*').eq('periode_id', periodeId), tpkId),
    scoped(supabase.from('tabel_pemasangan_barcode').select('*').eq('periode_id', periodeId), tpkId),
    scoped(supabase.from('tabel_tenaga_bantu').select('*').eq('periode_id', periodeId), tpkId).maybeSingle(),
    scoped(supabase.from('tabel_kebersihan').select('*').eq('periode_id', periodeId), tpkId).maybeSingle(),
    scoped(supabase.from('tabel_listrik').select('*').eq('periode_id', periodeId), tpkId).maybeSingle(),
    scoped(supabase.from('tabel_custom_item').select('*').eq('periode_id', periodeId), tpkId).order('urutan'),
    scoped(supabase.from('tabel_tarif_periode').select('*').eq('periode_id', periodeId), tpkId),
  ])

  const tarifMap = { ...DEFAULT_TARIF_PERIODE }
  ;(tarifDb || []).forEach(t => { tarifMap[t.kode] = t.tarif })

  const t = tumpuk || []
  const totalPenomoran = t.reduce((s,r) => s+(r.volume||0), 0)
  const totalSlag = t.filter(r=>['JATI','RIMBA_MAHONI'].includes(r.jenis))
    .reduce((s,r) => s+(r.volume||0), 0)

  const byJenis = (jenis) => {
    const rows = t.filter(r=>r.jenis===jenis)
    const fisik = rows.reduce((s,r)=>s+(r.volume||0),0)
    // Tarif diambil dari tarifMap per sortimen (single source of truth: Tarif Periode di Main Link)
    const nilai = rows.reduce((s,r)=>{
      const tarif = tarifMap[TUMPUK_TARIF_KODE[r.sortimen]] ?? (r.tarif||0)
      return s + (r.volume||0) * tarif
    }, 0)
    return { fisik, nilai, tarif: fisik>0 ? nilai/fisik : 0 }
  }

  const nilaiBrongkol = (brongkol||[]).reduce((s,r)=>s+(r.volume||0)*(r.tarif||0),0)
  const nilaiJati     = byJenis('JATI').nilai
  const nilaiMahoni   = byJenis('RIMBA_MAHONI').nilai
  const nilaiKedawung = byJenis('RIMBA_KEDAWUNG').nilai
  const h29 = nilaiJati + nilaiMahoni + nilaiKedawung + nilaiBrongkol

  const tandaFisik   = (tandaLaku||[]).reduce((s,r)=>s+(r.volume||0),0)
  const brongkolFisik = (brongkol||[]).reduce((s,r)=>s+(r.volume||0),0)

  // Barcode per jenis (JATI / MAHONI / KEDAWUNG)
  const barcodeBy = (jns) => {
    const rs = (barcode||[]).filter(r => r.jenis === jns)
    const fisik = rs.reduce((s,r)=>s+(r.jumlah||0),0)
    const nilai = rs.reduce((s,r)=>s+(r.jumlah||0)*(r.tarif||0),0)
    return { fisik, tarif: fisik>0 ? nilai/fisik : (rs[0]?.tarif || tarifMap.barcode) }
  }
  const bcJati     = barcodeBy('JATI')
  const bcMahoni   = barcodeBy('MAHONI')
  const bcKedawung = barcodeBy('KEDAWUNG')

  const tenagaJumlah = tenaga?.jumlah_orang || 6
  const tenagaTarif  = tenaga ? (tenaga.jumlah_orang||0) * (tenaga.tarif_per_orang||0) : 0

  const rows = [
    { _key:'penomoran', kode_rek:'51.69.43', uraian:'PENOMORAN KAPLING',
      satuan:'M3', fisik:totalPenomoran, tarif:tarifMap.penomoran, _noMode:'normal', _src:'auto' },
    { _key:'sabuk', kode_rek:'51.69.43', uraian:'SABUK KAPLING',
      satuan:'M3', fisik:totalPenomoran, tarif:tarifMap.sabuk, _noMode:'normal', _src:'auto' },
    { _key:'tanda_laku', kode_rek:'51.69.43', uraian:'TANDA LAKU',
      satuan:'M3', fisik:tandaFisik, tarif:tarifMap.tanda_laku, _noMode:'normal', _src:'auto' },
    { _key:'slaghammer', kode_rek:'51.69.43', uraian:'SLAGHAMMER',
      satuan:'M3', fisik:totalSlag, tarif:tarifMap.slaghammer, _noMode:'normal', _src:'auto' },
    { _key:'tumpuk_jati', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING JATI',
      satuan:'M3', ...byJenis('JATI'), _noMode:'group', _groupValue:h29, _src:'auto' },
    { _key:'tumpuk_mahoni', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (MAHONI)',
      satuan:'M3', ...byJenis('RIMBA_MAHONI'), _noMode:'none', _src:'auto' },
    { _key:'tumpuk_kedawung', kode_rek:'51.69.44', uraian:'TUMPUK KAPLING RIMBA (KEDAWUNG)',
      satuan:'M3', ...byJenis('RIMBA_KEDAWUNG'), _noMode:'none', _src:'auto' },
    { _key:'brongkol', kode_rek:'51.69.44', uraian:'TUMPUK BRONGKOL',
      satuan:'SM', fisik:brongkolFisik, tarif:tarifMap.brongkol, _noMode:'none', _src:'auto' },
    // Barcode dipecah per jenis biar masing-masing punya kwitansi sendiri
    { _key:'barcode_jati', kode_rek:'51.69.44', uraian:'PEMASANGAN BARCODE JATI',
      satuan:'BTG', fisik:bcJati.fisik, tarif:bcJati.tarif, _noMode:'normal', _src:'auto' },
    { _key:'barcode_mahoni', kode_rek:'51.69.44', uraian:'PEMASANGAN BARCODE MAHONI',
      satuan:'BTG', fisik:bcMahoni.fisik, tarif:bcMahoni.tarif, _noMode:'normal', _src:'auto' },
    { _key:'barcode_kedawung', kode_rek:'51.69.44', uraian:'PEMASANGAN BARCODE KEDAWUNG',
      satuan:'BTG', fisik:bcKedawung.fisik, tarif:bcKedawung.tarif, _noMode:'normal', _src:'auto' },
    ...(isPeriodeII ? [{
      _key:'tenaga', kode_rek:'51.69.91',
      uraian:`TENAGA BANTU ${tenagaJumlah} ORANG`,
      satuan:'BLN', fisik:1, tarif:tenagaTarif, _noMode:'normal', _src:'auto',
    }] : []),
    ...(isPeriodeII && kebersihan ? [{
      _key:'kebersihan', kode_rek:'51.69.91', uraian:'KEBERSIHAN',
      satuan:'PER', fisik:1, tarif:kebersihan.nominal||0, _noMode:'normal', _src:'auto',
    }] : []),
    ...(isPeriodeI && (listrik?.nominal||0) > 0 ? [{
      _key:'listrik', kode_rek:'51.69.91', uraian:'LISTRIK TPK',
      satuan:'BLN', fisik:1, tarif:listrik.nominal||0, _noMode:'normal', _src:'auto',
    }] : []),
    ...(custom||[]).map(item => ({
      _key:`custom_${item.id}`, kode_rek:'51.69.91',
      uraian:item.label, satuan:item.satuan||'',
      fisik:item.fisik||0, tarif:item.tarif||0, _noMode:'normal', _src:'auto',
    })),
  ]

  return applyNumbers(rows)
}

// Helper: hitung total UK satu periode (dipakai Dashboard)
export async function computeTotalUK(periodeId, periodeLabel, options = {}) {
  const rows = await buildRows(periodeId, periodeLabel, options)
  return rows.reduce((s, r) => s + (r.fisik||0) * (r.tarif||0), 0)
}
