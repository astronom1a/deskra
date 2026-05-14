import { useEffect, useState, Fragment as Frag } from 'react'
import { useParams } from 'react-router-dom'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { supabase } from '../../lib/supabase'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, formatAngkaFisik, formatTanggalLengkap } from './cetakHelpers'
import { resolvePejabatForPeriode } from '../../lib/pejabatSnapshot'
import { getTpkNameUpper } from '../../lib/effectiveTpk'

const ARIAL = { fontFamily: 'Arial, Helvetica, sans-serif' }

// Mapping itemKey → konfigurasi pekerjaan.
// `workerName` kalau di-set: pakai pekerja dengan nama itu (case-insensitive).
const ITEM_CONFIG = {
  penomoran:  { perincian: 'Biaya penomoran kapling pada bontos dan badan kayu jati, rimba dengan cat', volSatuan: 'M3' },
  sabuk:      { perincian: 'Biaya sabuk kapling',     volSatuan: 'M3' },
  tanda_laku: { perincian: 'BIAYA MEMBERI TANDA LAKU', volSatuan: 'M3' },
  slaghammer: { perincian: 'PENANDAAN SLAGHAMMER',    volSatuan: 'M3', workerPosisi: 'SLAGHAMMER' },
  barcode:    { perincian: 'PASANG BARCODE',          volSatuan: 'BTG', workerPosisi: 'BARCODE' },
  kebersihan: { perincian: 'BERSIH - BERSIH KANTOR DAN HALAMAN TPK %TPK%', volSatuan: 'BLN', workerPosisi: 'KEBERSIHAN' },
  listrik:    { perincian: 'LISTRIK TPK',             volSatuan: 'BLN' },
  tumpuk:     { perincian: 'Bea tumpuk kapling',      volSatuan: 'M3', mode: 'tumpuk' },
  tenaga:     { perincian: 'TENAGA BANTU',            volSatuan: 'BULAN', mode: 'tenaga' },
}

// Extract nama desa dari alamat lengkap.
// Mis. "DUSUN X, RT/RW 01/02, DESA BAJULMATI, KECAMATAN ..." → "BAJULMATI"
// Fallback: alamat asli (untuk input yang sudah singkat seperti "Wongsorejo").
function hasPos(worker, posValue) {
  return (worker.posisi || '').split(',').map(s => s.trim()).includes(posValue)
}

function extractDesa(alamat) {
  if (!alamat) return ''
  const m = alamat.match(/DESA\s+([^,]+)/i)
  return m ? m[1].trim() : alamat.trim()
}

const MIN_BERSIH_PER_HARI = 110_000
const ROWS_MIN = 20

export default function CetakLampiran31() {
  return (
    <CetakLayout title="Cetak Lampiran 3.1" landscape>
      {(periode) => <Lampiran31Doc periode={periode}/>}
    </CetakLayout>
  )
}

function Lampiran31Doc({ periode }) {
  const { itemKey } = useParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    (async () => {
      const [rows, pejabatRes, tumpuk, brongkol, barcode, tenagaBantu, tenagaKerja] = await Promise.all([
        buildRows(periode.id, periode.periode, { tpkId: periode.tpk_id }),
        resolvePejabatForPeriode(periode),
        supabase.from('tabel_tumpuk_kapling').select('*').eq('periode_id', periode.id).eq('tpk_id', periode.tpk_id),
        supabase.from('tabel_tumpuk_brongkol').select('*').eq('periode_id', periode.id).eq('tpk_id', periode.tpk_id),
        supabase.from('tabel_pemasangan_barcode').select('*').eq('periode_id', periode.id).eq('tpk_id', periode.tpk_id),
        supabase.from('tabel_tenaga_bantu').select('*').eq('periode_id', periode.id).eq('tpk_id', periode.tpk_id).maybeSingle(),
        supabase.from('tabel_tenaga_kerja').select('*').eq('tpk_id', periode.tpk_id).eq('aktif', true).order('nama'),
      ])
      const pejabat = pejabatRes || {}
      setData({
        periode, rows, pejabat,
        tumpuk: tumpuk.data||[],
        brongkol: brongkol.data||[],
        barcode: barcode.data||[],
        tenagaBantu: tenagaBantu.data || null,
        tenagaKerja: tenagaKerja.data || [],
      })
    })()
  }, [periode])

  if (!data) return <CetakPageSkeleton landscape />

  // Custom item TIDAK di-generate Lampiran 3.1 (sesuai permintaan)
  if (itemKey?.startsWith('custom_')) {
    return (
      <p className="text-center text-amber-600 py-10 text-sm">
        Lampiran 3.1 tidak tersedia untuk item custom.
      </p>
    )
  }
  const cfg = ITEM_CONFIG[itemKey]
  if (!cfg) {
    return (
      <p className="text-center text-amber-600 py-10 text-sm">
        Lampiran 3.1 untuk item <code>{itemKey}</code> belum tersedia.
      </p>
    )
  }

  // Resolve item dari rows / aggregator
  let item
  if (itemKey === 'barcode') {
    const fisik = (data.barcode||[]).reduce((s,r)=>s+(r.jumlah||0),0)
    const nilai = (data.barcode||[]).reduce((s,r)=>s+(r.jumlah||0)*(r.tarif||0),0)
    item = { fisik, tarif: fisik>0 ? nilai/fisik : 0, nilai }
  } else if (itemKey === 'tumpuk') {
    const tNilai = (data.tumpuk||[]).reduce((s,r)=>s+(r.volume||0)*(r.tarif||0),0)
    const bNilai = (data.brongkol||[]).reduce((s,r)=>s+(r.volume||0)*(r.tarif||0),0)
    item = { fisik: 0, tarif: 0, nilai: tNilai + bNilai }
  } else if (itemKey === 'tenaga') {
    const tarif = data.tenagaBantu?.tarif_per_orang || 750000
    const list = data.tenagaKerja.filter(t => hasPos(t, 'TENAGA_BANTU'))
    item = { fisik: list.length, tarif, nilai: list.length * tarif }
  } else {
    const r = data.rows.find(x => x._key === itemKey)
    if (!r) {
      return <p className="text-center text-red-500 py-10 text-sm">Item <code>{itemKey}</code> tidak ditemukan.</p>
    }
    item = { fisik: r.fisik||0, tarif: r.tarif||0, nilai: (r.fisik||0)*(r.tarif||0) }
  }

  // Skip kalau value = 0
  if ((item.nilai||0) === 0) {
    return <p className="text-center text-gray-400 py-10 text-sm italic">Belum ada nilai untuk item ini.</p>
  }

  const grand = Math.round(item.nilai)
  const tglFooter = formatTanggalLengkap(periode.tgl_akhir)

  return (
    <div className="text-[10px] leading-tight text-black" style={ARIAL}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="grid grid-cols-12 items-start mb-2">
        <div className="col-span-9 text-[12px] text-center">
          <p>( PERUSAHAAN UMUM KEHUTANAN NEGARA )</p>
          <p>PERUM PERHUTANI</p>
        </div>
        <div className="col-span-3 text-right">
          <p>Lampiran 3.1</p>
        </div>
      </div>

      <div className="flex justify-end mb-1">
        <div className="bg-black text-white px-3 py-1 text-[11px] font-semibold">LAMPIRAN DAFTAR PEMBAYARAN</div>
      </div>

      {/* ── Body table ─────────────────────────────────── */}
      {cfg.mode === 'tumpuk'
        ? <TumpukBody data={data} item={item} grand={grand}/>
        : cfg.mode === 'tenaga'
          ? <TenagaBody data={data} item={item} grand={grand}/>
          : <SingleWorkerBody data={data} item={item} grand={grand} cfg={cfg} itemKey={itemKey}/>}

      {/* ── Footer + TTD ──────────────────────────────── */}
      <div className="text-right mt-2 mb-6">WONGSOREJO,&nbsp; {tglFooter}</div>
      <div className="grid grid-cols-3 mt-4 text-center">
        <div>
          <p className="text-left">Mengetahui</p>
          <div className="h-12"/>
          <p className="text-left font-semibold">{data.pejabat.kepala_tpk?.nama || ''}</p>
        </div>
        <div>
          <p>Saksi</p>
          <p>1. {data.pejabat.pelaksana?.nama || ''} &nbsp;&nbsp;(……………………..)</p>
          <div className="h-12"/>
        </div>
        <div>
          <p className="text-right">Dibuat oleh</p>
          <div className="h-12"/>
          <p className="text-right font-semibold">{data.pejabat.tu_tpk?.nama || ''}</p>
        </div>
      </div>
    </div>
  )
}

// ── TABLE: Single worker (penomoran/sabuk/tanda_laku/slaghammer/barcode/kebersihan/listrik/custom)
function SingleWorkerBody({ data, item, grand, cfg, itemKey }) {
  // Pekerja: jika cfg.workerName di-set → cari by nama (case-insensitive),
  // selain itu pakai pekerja pertama posisi=TENAGA_KAPLING aktif.
  const worker = (() => {
    if (cfg.workerPosisi) {
      const found = data.tenagaKerja.find(t => hasPos(t, cfg.workerPosisi))
      if (found) return found
    }
    return data.tenagaKerja.find(t => hasPos(t, 'TENAGA_KAPLING')) || {}
  })()

  return (
    <table className="w-full border-collapse border border-black text-[9.5px]">
      <thead>
        <tr className="text-center align-middle">
          <th rowSpan={2} className="border border-black px-1 py-1 w-[3%]">No</th>
          <th colSpan={3} className="border border-black px-1 py-1">Pekerja</th>
          <th colSpan={2} className="border border-black px-1 py-1">Pekerjaan</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Tarif<br/>( Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Pembayaran<br/>Kotor(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[6%]">PPh<br/>(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Pembayaran<br/>Bersih(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[12%]">Tanda tangan /<br/>Cap Jempol</th>
        </tr>
        <tr className="text-center">
          <th className="border border-black px-1 py-1 w-[14%]">Nama</th>
          <th className="border border-black px-1 py-1">NIK</th>
          <th className="border border-black px-1 py-1">Alamat</th>
          <th className="border border-black px-1 py-1">Perincian</th>
          <th className="border border-black px-1 py-1 w-[8%]">Vol/{cfg.volSatuan}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border border-black text-center align-top">1</td>
          <td className="border border-black px-1 align-top">{worker.nama || ''}</td>
          <td className="border border-black px-1 align-top">{worker.nik || ''}</td>
          <td className="border border-black px-1 align-top">{extractDesa(worker.alamat)}</td>
          <td className="border border-black px-1 align-top">{cfg.perincian.replace(/%TPK%/g, getTpkNameUpper(data.periode))}</td>
          <td className="border border-black px-1 text-right align-top">{formatAngkaFisik(item.fisik)}</td>
          <td className="border border-black px-1 text-right align-top">{formatAngka(item.tarif)}</td>
          <td className="border border-black px-1 text-right align-top">{formatAngka(grand)}</td>
          <td className="border border-black px-1 text-center align-top">-</td>
          <td className="border border-black px-1 text-right align-top">{formatAngka(grand)}</td>
          <td className="border border-black px-1 text-left align-top">1.</td>
        </tr>
        {Array.from({length: ROWS_MIN-1}).map((_,i) => (
          <tr key={i}>
            {Array.from({length:11}).map((_,j) => <td key={j} className="border border-black h-5"/>)}
          </tr>
        ))}
        <tr className="font-bold">
          <td colSpan={7} className="border border-black px-2 py-1 text-center">JUMLAH</td>
          <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          <td className="border border-black text-center">-</td>
          <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          <td className="border border-black"/>
        </tr>
      </tbody>
    </table>
  )
}

// ── TABLE: Tumpuk Kapling (multi-worker split rata + breakdown jenis/sortimen)
const JENIS_LABEL = { JATI: 'KAYU JATI', RIMBA_MAHONI: 'KAYU MAHONI', RIMBA_KEDAWUNG: 'KAYU KEDAWUNG' }
const JENIS_ORDER = ['JATI', 'RIMBA_MAHONI', 'RIMBA_KEDAWUNG']
const SORTIMEN_LABEL = { AI: 'A I', AII: 'A II', AIII: 'A III' }
const SORTIMEN_ORDER = ['AI', 'AII', 'AIII']

function TumpukBody({ data, grand }) {
  // ── Workers (TENAGA_KAPLING aktif) ──
  const workers = data.tenagaKerja.filter(t => hasPos(t, 'TENAGA_KAPLING'))
  const N = workers.length

  // Bagi rata: per pekerja = floor(grand/N), pekerja terakhir = sisa
  let perWorker = 0, lastWorker = 0
  if (N > 0) {
    perWorker = Math.floor(grand / N)
    lastWorker = grand - perWorker * (N - 1)
  }

  // ── Pekerjaan rows: hanya jenis/sortimen dengan value > 0 ──
  const t = data.tumpuk || []
  const get = (jenis, sortimen) => t.find(r => r.jenis === jenis && r.sortimen === sortimen)
  const pekerjaanRows = []
  pekerjaanRows.push({ type: 'header', label: 'Bea tumpuk kapling' })

  JENIS_ORDER.forEach(jenis => {
    const items = SORTIMEN_ORDER
      .map(sort => {
        const r = get(jenis, sort)
        return r && r.volume > 0 ? { sortimen: sort, volume: r.volume, tarif: r.tarif } : null
      })
      .filter(Boolean)
    if (items.length === 0) return
    pekerjaanRows.push({ type: 'jenis', label: JENIS_LABEL[jenis] })
    items.forEach((s, i) => {
      pekerjaanRows.push({
        type: 'sortimen',
        sortimen: SORTIMEN_LABEL[s.sortimen],
        // header jenis hanya untuk row pertama (sudah dihandle terpisah)
        volume: s.volume, tarif: s.tarif, nilai: Math.round(s.volume * s.tarif),
      })
    })
    // subtotal jenis
    const subVol = items.reduce((s,x)=>s+x.volume,0)
    const subNilai = items.reduce((s,x)=>s+x.volume*x.tarif,0)
    pekerjaanRows.push({ type: 'subtotal', volume: subVol, nilai: Math.round(subNilai) })
  })

  // Brongkol (KA) hanya jika value > 0
  const bVol = (data.brongkol||[]).reduce((s,r)=>s+(r.volume||0),0)
  const bNilai = (data.brongkol||[]).reduce((s,r)=>s+(r.volume||0)*(r.tarif||0),0)
  if (bVol > 0) {
    const bTarif = bVol > 0 ? bNilai/bVol : 0
    pekerjaanRows.push({ type: 'brongkol', volume: bVol, tarif: bTarif, nilai: Math.round(bNilai) })
  }

  const totalRows = Math.max(N, pekerjaanRows.length)

  return (
    <table className="w-full border-collapse border border-black text-[9.5px]">
      <thead>
        <tr className="text-center align-middle">
          <th rowSpan={2} className="border border-black px-1 py-1 w-[3%]">No</th>
          <th colSpan={3} className="border border-black px-1 py-1">Pekerja</th>
          <th colSpan={2} className="border border-black px-1 py-1">Pekerjaan</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[7%]">Tarif<br/>( Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Pembayaran<br/>Kotor(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[6%]">PPh<br/>(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Pembayaran<br/>Bersih(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[10%]">Tanda tangan /<br/>Cap Jempol</th>
        </tr>
        <tr className="text-center">
          <th className="border border-black px-1 py-1">Nama</th>
          <th className="border border-black px-1 py-1">NIK</th>
          <th className="border border-black px-1 py-1">Alamat</th>
          <th className="border border-black px-1 py-1">Perincian</th>
          <th className="border border-black px-1 py-1 w-[8%]">Vol/Satuan</th>
        </tr>
      </thead>
      <tbody>
        {Array.from({length: totalRows}).map((_, i) => {
          const w = workers[i]
          const p = pekerjaanRows[i]
          const isLastWorker = i === N - 1
          const bersih = w ? (isLastWorker ? lastWorker : perWorker) : null

          let perincianCell = null, volCell = null, tarifCell = null, kotorCell = null
          if (p) {
            if (p.type === 'header') {
              perincianCell = p.label
            } else if (p.type === 'jenis') {
              perincianCell = p.label
            } else if (p.type === 'sortimen') {
              perincianCell = p.sortimen
              volCell = formatAngkaFisik(p.volume)
              tarifCell = formatAngka(p.tarif)
              kotorCell = formatAngka(p.nilai)
            } else if (p.type === 'subtotal') {
              volCell = formatAngkaFisik(p.volume)
              kotorCell = formatAngka(p.nilai)
            } else if (p.type === 'brongkol') {
              perincianCell = 'BRONGKOL/KA'
              volCell = formatAngkaFisik(p.volume)
              tarifCell = formatAngka(p.tarif)
              kotorCell = formatAngka(p.nilai)
            }
          }

          return (
            <tr key={i}>
              <td className="border border-black text-center align-top">{w ? i+1 : ''}</td>
              <td className="border border-black px-1 align-top">{w?.nama || ''}</td>
              <td className="border border-black px-1 align-top">{w?.nik || ''}</td>
              <td className="border border-black px-1 align-top">{extractDesa(w?.alamat)}</td>
              <td className="border border-black px-1 align-top">{perincianCell}</td>
              <td className="border border-black px-1 text-right align-top">{volCell}</td>
              <td className="border border-black px-1 text-right align-top">{tarifCell}</td>
              <td className="border border-black px-1 text-right align-top">{kotorCell}</td>
              <td className="border border-black px-1 text-center align-top">{w ? '' : ''}</td>
              <td className="border border-black px-1 text-right align-top">{w ? formatAngka(bersih) : ''}</td>
              <td className="border border-black px-1 text-left align-top">{w ? `${i+1}.` : ''}</td>
            </tr>
          )
        })}
        {Array.from({length: Math.max(0, ROWS_MIN - totalRows)}).map((_,i) => (
          <tr key={`filler-${i}`}>
            {Array.from({length:11}).map((_,j) => <td key={j} className="border border-black h-5"/>)}
          </tr>
        ))}
        <tr className="font-bold">
          <td colSpan={7} className="border border-black px-2 py-1 text-center">JUMLAH</td>
          <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          <td className="border border-black text-center">-</td>
          <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          <td className="border border-black"/>
        </tr>
      </tbody>
    </table>
  )
}

// ── TABLE: Tenaga Bantu (multi-worker)
function TenagaBody({ data, item, grand }) {
  const workers = data.tenagaKerja.filter(t => hasPos(t, 'TENAGA_BANTU'))
  const tarif = item.tarif

  return (
    <table className="w-full border-collapse border border-black text-[9.5px]">
      <thead>
        <tr className="text-center align-middle">
          <th rowSpan={2} className="border border-black px-1 py-1 w-[3%]">No</th>
          <th colSpan={3} className="border border-black px-1 py-1">Pekerja</th>
          <th colSpan={2} className="border border-black px-1 py-1">Pekerjaan</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[7%]">Tarif<br/>( Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Pembayaran<br/>Kotor(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[6%]">PPh<br/>(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[8%]">Pembayaran<br/>Bersih(Rp)</th>
          <th rowSpan={2} className="border border-black px-1 py-1 w-[10%]">Tanda tangan /<br/>Cap Jempol</th>
        </tr>
        <tr className="text-center">
          <th className="border border-black px-1 py-1">Nama</th>
          <th className="border border-black px-1 py-1">NIK</th>
          <th className="border border-black px-1 py-1">Alamat</th>
          <th className="border border-black px-1 py-1">Perincian</th>
          <th className="border border-black px-1 py-1 w-[8%]">Vol/Satuan</th>
        </tr>
      </thead>
      <tbody>
        {workers.map((w,i) => (
          <tr key={w.id}>
            <td className="border border-black text-center align-top">{i+1}</td>
            <td className="border border-black px-1 align-top">{w.nama}</td>
            <td className="border border-black px-1 align-top">{w.nik}</td>
            <td className="border border-black px-1 align-top">{extractDesa(w.alamat)}</td>
            <td className="border border-black px-1 align-top">TENAGA BANTU</td>
            <td className="border border-black px-1 text-right align-top">1 BULAN</td>
            <td className="border border-black px-1 text-right align-top"/>
            <td className="border border-black px-1 text-right align-top">{formatAngka(tarif)}</td>
            <td className="border border-black px-1 text-center align-top"/>
            <td className="border border-black px-1 text-right align-top">{formatAngka(tarif)}</td>
            <td className="border border-black px-1 text-left align-top">{i+1}.</td>
          </tr>
        ))}
        {Array.from({length: Math.max(0, ROWS_MIN - workers.length)}).map((_,i) => (
          <tr key={`filler-${i}`}>
            {Array.from({length:11}).map((_,j) => <td key={j} className="border border-black h-5"/>)}
          </tr>
        ))}
        <tr className="font-bold">
          <td colSpan={7} className="border border-black px-2 py-1 text-center">JUMLAH</td>
          <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          <td className="border border-black text-center">-</td>
          <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          <td className="border border-black"/>
        </tr>
      </tbody>
    </table>
  )
}
