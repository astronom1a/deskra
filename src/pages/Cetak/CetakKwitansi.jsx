import { useEffect, useState, Fragment as Frag } from 'react'
import { useParams } from 'react-router-dom'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { supabase } from '../../lib/supabase'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, formatAngkaFisik, terbilangBungkus, formatTanggalTtd } from './cetakHelpers'
import { getNamaTpk, getNamaTpkUpper } from '../../lib/useAccount'

const TIMES = { fontFamily: '"Times New Roman", Times, serif' }

// Mapping itemKey → konfigurasi tampilan kwitansi
// (TUMPUK KAPLING & TENAGA BANTU ditunda — menunggu contoh)
const ITEM_CONFIG = {
  penomoran:        { title: 'BIAYA MEMBERI NOMOR KAPLING / BONTOS', subSrc: 'tumpuk' },
  sabuk:            { title: 'BIAYA SABUK KAPLING',                  subSrc: 'tumpuk' },
  tanda_laku:       { title: 'BIAYA TANDA LAKU',                     subSrc: 'tanda_laku' },
  slaghammer:       { title: 'BIAYA SLAGHAMMER',                     subSrc: 'tumpuk_slag' },
  // Barcode digabung — sub-rows per jenis (JATI / MAHONI / KEDAWUNG)
  barcode:          { title: 'BIAYA PEMASANGAN BARCODE',             subSrc: 'barcode' },
  kebersihan:       { title: 'BIAYA KEBERSIHAN',                     subSrc: null },
  listrik:          { title: 'BIAYA LISTRIK TPK',                    subSrc: null },
  // Tumpuk Kapling — multi-row dgn group per jenis & sortimen
  tumpuk:           { title: 'BIAYA TUMPUK KAPLING', mode: 'multi-tumpuk' },
  // Tenaga bantu — multi-row (1 tenaga = 1 baris tabel)
  tenaga:           { title: 'Bantuan Transport\nTenaga Bantu Mandor', mode: 'multi-tenaga' },
  // custom_<id> handled inline
}

const JENIS_LABEL = { JATI: 'JATI', RIMBA_MAHONI: 'MAHONI', RIMBA_KEDAWUNG: 'KEDAWUNG' }

export default function CetakKwitansi() {
  return (
    <CetakLayout title="Cetak Kwitansi">
      {(periode) => <KwitansiDoc periode={periode}/>}
    </CetakLayout>
  )
}

function KwitansiDoc({ periode }) {
  const { itemKey } = useParams()
  const [data, setData] = useState(null)
  const tpkName = getNamaTpk()
  const tpkUpper = getNamaTpkUpper()

  useEffect(() => {
    (async () => {
      const [rows, pejabatRes, tumpuk, tandaLaku, barcode, brongkol, tenagaBantu, tenagaKerja] = await Promise.all([
        buildRows(periode.id, periode.periode),
        supabase.from('tabel_pejabat').select('*').eq('aktif', true),
        supabase.from('tabel_tumpuk_kapling').select('*').eq('periode_id', periode.id),
        supabase.from('tabel_tanda_laku').select('*').eq('periode_id', periode.id),
        supabase.from('tabel_pemasangan_barcode').select('*').eq('periode_id', periode.id),
        supabase.from('tabel_tumpuk_brongkol').select('*').eq('periode_id', periode.id),
        supabase.from('tabel_tenaga_bantu').select('*').eq('periode_id', periode.id).maybeSingle(),
        supabase.from('tabel_tenaga_kerja').select('*').eq('aktif', true).order('nama'),
      ])
      const has = (p, n) => (p.jabatan||'').toLowerCase().includes(n)
      const find = (pred) => (pejabatRes.data||[]).find(pred) || {}
      const pejabat = {
        pelaksana:   find(p => has(p,'pelaksana')),
        wakil_adm:   find(p => has(p,'wakil administratur') || has(p,'waka administratur')),
        kepala_tpk:  find(p => has(p,'kepala tpk') || has(p,'bendahara pengeluaran')),
        tu_tpk:      find(p => has(p,'tu tpk') || has(p,'sp tpk') || has(p,'sp.tpk')),
      }
      setData({
        rows, pejabat,
        tumpuk: tumpuk.data||[],
        tandaLaku: tandaLaku.data||[],
        barcode: barcode.data||[],
        brongkol: brongkol.data||[],
        tenagaBantu: tenagaBantu.data || null,
        tenagaKerja: (tenagaKerja.data || []).filter(w => (w.posisi || '').split(',').map(s => s.trim()).includes('TENAGA_BANTU')),
      })
    })()
  }, [periode.id])

  if (!data) return <CetakPageSkeleton />

  // Cari item dari rows. Special-case:
  // - 'barcode' = aggregate semua jenis barcode
  // - 'tenaga'  = multi-row dari tabel_tenaga_kerja (posisi=TENAGA_BANTU)
  let item
  if (itemKey === 'barcode') {
    const bc = data.barcode || []
    const fisik = bc.reduce((s,r) => s + (r.jumlah||0), 0)
    const nilai = bc.reduce((s,r) => s + (r.jumlah||0)*(r.tarif||0), 0)
    item = {
      _key:'barcode', kode_rek:'51.69.44',
      uraian:'PEMASANGAN BARCODE', satuan:'BTG',
      fisik, tarif: fisik > 0 ? nilai/fisik : 0,
    }
  } else if (itemKey === 'tumpuk') {
    const t = data.tumpuk || []
    const b = data.brongkol || []
    const totalTumpuk = t.reduce((s,r) => s + (r.volume||0)*(r.tarif||0), 0)
    const totalBrongkol = b.reduce((s,r) => s + (r.volume||0)*(r.tarif||0), 0)
    const grandT = totalTumpuk + totalBrongkol
    item = {
      _key:'tumpuk', kode_rek:'51.69.44',
      uraian:'TUMPUK KAPLING', satuan:'M3',
      fisik: 0, tarif: 0,
      _grandOverride: grandT,
    }
  } else if (itemKey === 'tenaga') {
    const tarifPerOrang = data.tenagaBantu?.tarif_per_orang || 750000
    const list = data.tenagaKerja || []
    item = {
      _key:'tenaga', kode_rek:'51.69.43',
      uraian:'BANTUAN TRANSPORT TENAGA BANTU MANDOR', satuan:'BLN',
      fisik: list.length, tarif: tarifPerOrang,
    }
  } else {
    item = data.rows.find(r => r._key === itemKey)
  }
  if (!item) {
    return (
      <p className="text-center text-red-500 py-10 text-sm">
        Item <code>{itemKey}</code> tidak ditemukan di periode ini.
      </p>
    )
  }

  const cfg = itemKey.startsWith('custom_')
    ? { title: item.uraian, subSrc: null }
    : ITEM_CONFIG[itemKey]
  if (!cfg) {
    return (
      <p className="text-center text-amber-600 py-10 text-sm">
        Kwitansi untuk item <code>{itemKey}</code> belum tersedia.
      </p>
    )
  }

  const totalFisik = Number(item.fisik) || 0
  const tarif      = Number(item.tarif) || 0
  const grand      = item._grandOverride !== undefined
    ? Math.round(item._grandOverride)
    : Math.round(totalFisik * tarif)

  // Hitung breakdown sub-rows per jenis
  const subRows = computeSubRows(cfg.subSrc, data, totalFisik)

  // Bulan + tahun dari tgl_awal periode → "April 2026"
  const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const dAwal = periode.tgl_awal ? new Date(periode.tgl_awal) : null
  const bulanTahun = dAwal ? `${BULAN_FULL[dAwal.getMonth()]} ${dAwal.getFullYear()}` : ''

  const tglTtd = formatTanggalTtd(periode.tgl_akhir)
  const kodeRekDigits = (item.kode_rek || '').replace(/\D/g, '').padStart(6, '0').slice(0,6).split('')

  return (
    <div className="text-[11px] leading-snug text-black" style={TIMES}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="text-center mb-2">
        <p className="font-bold text-[13px]">PERUSAHAAN UMUM KEHUTANAN NEGARA</p>
        <p className="font-bold text-[12px]">( PERUM PERHUTANI )</p>
        <p className="font-bold text-[12px]">DIVISI REGIONAL JAWA TIMUR</p>
        <p className="font-bold text-[12px]">{tpkUpper}</p>
      </div>

      {/* ── Kotak atas: Telah terima (kiri) + KUITANSI (kanan) ── */}
      <div className="grid grid-cols-12 border border-black">
        <div className="col-span-7 p-2 border-r border-black space-y-2">
          <p>Telah terima dari :</p>
          <div className="grid grid-cols-[60px_10px_1fr] gap-y-1 items-baseline">
            <span>N a m a</span><span>:</span>
            <span>Bend Umum KPH BANYUWANGI UTARA</span>
            <span>Alamat</span><span>:</span>
            <span>Jl. Jaksa Agung Suprapto No.34</span>
            <span/><span/>
            <span>Banyuwangi</span>
          </div>
        </div>
        <div className="col-span-5 p-2 text-[10.5px]">
          <p className="font-bold border-b border-black pb-0.5 mb-1">KUITANSI PEMBAYARAN</p>
          <p>Masa / Periode : <span className="font-bold">{periode.periode}</span></p>
          <p>Nomor Bukti :</p>
          <p className="mt-1">Kode Rekening dan Rupiah :</p>

          {/* 4 baris kotak digit + nominal Rp */}
          <div className="space-y-1 mt-1">
            <KodeRow digits={['','','','','','']} amount=""/>
            <KodeRow digits={['','','','','','']} amount=""/>
            <KodeRow digits={kodeRekDigits} amount={formatAngka(grand)} bold/>
            <KodeRow digits={['','','','','','']} amount=""/>
          </div>
          <p className="mt-2">Rekening Lawan : ………………</p>
        </div>
      </div>

      {/* ── Banyaknya Uang ─────────────────────────────── */}
      <div className="grid grid-cols-[120px_1fr] border-x border-b border-black">
        <div className="border-r border-black p-1">Banyaknya Uang :</div>
        <div className="p-1 font-bold">{terbilangBungkus(grand)}</div>
      </div>

      {/* ── Untuk Pembayaran ───────────────────────────── */}
      <p className="mt-1">untuk Pembayaran Upah Kegiatan Pekerjaan/Borongan/Lemburan/Pemberian barang.</p>

      {/* ── Tabel utama ────────────────────────────────── */}
      <table className="w-full border-collapse border border-black text-[10px] mt-1">
        <thead>
          <tr className="text-center align-middle">
            <th className="border border-black px-1 py-1 w-[4%]">No</th>
            <th className="border border-black px-1 py-1 text-left">Uraian</th>
            <th className="border border-black px-1 py-1 w-[10%]">Vol</th>
            <th className="border border-black px-1 py-1 w-[8%]">Tarif<br/>(Rp.)</th>
            <th className="border border-black px-1 py-1 w-[11%]">Pembayaran<br/>Pokok (Rp.)</th>
            <th className="border border-black px-1 py-1 w-[6%]">PPN<br/>(Rp.)</th>
            <th className="border border-black px-1 py-1 w-[11%]">Pembayaran<br/>Kotor (Rp.)</th>
            <th className="border border-black px-1 py-1 w-[6%]">PPh<br/>(Rp.)</th>
            <th className="border border-black px-1 py-1 w-[12%]">Pembayaran<br/>Bersih (Rp.)</th>
          </tr>
        </thead>
        <tbody>
          {cfg.mode === 'multi-tumpuk' ? (
            <TumpukKaplingBody data={data} grand={grand} formatAngka={formatAngka} formatAngkaFisik={formatAngkaFisik}/>
          ) : cfg.mode === 'multi-tenaga' ? (
            <>
              {/* Title row */}
              <tr>
                <td className="border border-black text-center align-top px-1 py-1"/>
                <td className="border border-black align-top px-2 py-1">
                  <p>Bantuan Transport</p>
                  <p>Tenaga Bantu Mandor</p>
                </td>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black text-center">-</td>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
              </tr>
              {/* Per-tenaga rows */}
              {(data.tenagaKerja||[]).map((tn,i) => (
                <tr key={tn.id}>
                  <td className="border border-black text-center align-top px-1 py-1"/>
                  <td className="border border-black align-top px-2 py-1">a/n {tn.nama}</td>
                  <td className="border border-black text-right align-top px-1 py-1">1 bln</td>
                  <td className="border border-black text-right align-top px-1 py-1">{formatAngka(tarif)}</td>
                  <td className="border border-black text-right align-top px-1 py-1">{formatAngka(tarif)}</td>
                  <td className="border border-black"/>
                  <td className="border border-black text-right align-top px-1 py-1">{formatAngka(tarif)}</td>
                  <td className="border border-black"/>
                  <td className="border border-black text-right align-top px-1 py-1">{formatAngka(tarif)}</td>
                </tr>
              ))}
              {/* Footer info di kolom Uraian */}
              <tr>
                <td className="border border-black"/>
                <td className="border border-black px-2 py-1 align-top">
                  <p>{bulanTahun}</p>
                  <p>(Surat terlampir)</p>
                </td>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
                <td className="border border-black"/>
              </tr>
              {/* Spacer */}
              <tr><td colSpan={9} className="border border-black h-4"/></tr>
              {/* Jumlah */}
              <tr className="font-bold">
                <td colSpan={4} className="border border-black px-2 py-1 text-right">Jumlah Rp.</td>
                <td className="border border-black text-center">-</td>
                <td className="border border-black text-center">-</td>
                <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
                <td className="border border-black text-center">-</td>
                <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="border border-black text-center align-top px-1 py-1"></td>
                <td className="border border-black align-top px-2 py-1">
                  <p className="font-semibold">{cfg.title} :</p>
                  {subRows && subRows.length > 0 && (
                    <div className="mt-1">
                      {subRows.map((s,i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] gap-x-2">
                          <span>{s.label}</span>
                          <span className="text-right tabular-nums">{formatAngkaFisik(s.fisik)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                <td className="border border-black text-right align-bottom px-1 py-1 tabular-nums">
                  {formatAngkaFisik(totalFisik)}
                </td>
                <td className="border border-black text-right align-bottom px-1 py-1">{formatAngka(tarif)}</td>
                <td className="border border-black text-right align-bottom px-1 py-1">{formatAngka(grand)}</td>
                <td className="border border-black text-center align-bottom px-1 py-1">-</td>
                <td className="border border-black text-right align-bottom px-1 py-1">{formatAngka(grand)}</td>
                <td className="border border-black text-center align-bottom px-1 py-1">-</td>
                <td className="border border-black text-right align-bottom px-1 py-1">{formatAngka(grand)}</td>
              </tr>
              <tr><td colSpan={9} className="border border-black h-44"/></tr>
              <tr className="font-bold">
                <td colSpan={4} className="border border-black px-2 py-1 text-right">Jumlah Rp.</td>
                <td className="border border-black text-center">-</td>
                <td className="border border-black text-center">-</td>
                <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
                <td className="border border-black text-center">-</td>
                <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {/* ── Highlighted total ──────────────────────────── */}
      <div className="flex items-center gap-3 mt-2 mb-3">
        <span className="ml-8">Jumlah Rp.</span>
        <div className="bg-emerald-100 border border-emerald-700 px-6 py-1 font-bold text-[12px]">
          {formatAngka(grand)}
        </div>
      </div>

      {/* ── TTD 4 kolom ────────────────────────────────── */}
      <table className="w-full border-collapse border border-black text-[10px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 w-[12%] align-top font-semibold">Keterangan</td>
            <td className="border border-black p-1 w-[22%] align-top text-center">
              Brg/Jasa/Pekerjaan telah<br/>diterima/dikerjakan dgn baik
            </td>
            <td className="border border-black p-1 w-[22%] align-top text-center">Mengetahui / Setuju :</td>
            <td className="border border-black p-1 w-[22%] align-top text-center">Boleh Dibayar :</td>
            <td className="border border-black p-1 w-[22%] align-top text-center">Yang Membayar/Menerima</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Tempat, Tgl</td>
            <td className="border border-black p-1 text-center">BWI, {tglTtd}</td>
            <td className="border border-black p-1 text-center">BWI, {tglTtd}</td>
            <td className="border border-black p-1 text-center">BWI, {tglTtd}</td>
            <td className="border border-black p-1 text-center">BWI, {tglTtd}</td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Jabatan</td>
            <td className="border border-black p-1 text-center">
              Pelaksana Kegiatan<br/>Mandor TPK
            </td>
            <td className="border border-black p-1 text-center">
              Kuasa pengguna Anggaran<br/>Wk.Adm / KSKPH
            </td>
            <td className="border border-black p-1 text-center">
              Bendahara Pengeluaran/PPC<br/>Kepala {tpkName}
            </td>
            <td className="border border-black p-1 text-center">
              Sp.{tpkName}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Tanda Tangan</td>
            <td className="border border-black p-1 h-14"/>
            <td className="border border-black p-1 h-14"/>
            <td className="border border-black p-1 h-14"/>
            <td className="border border-black p-1 h-14"/>
          </tr>
          <tr>
            <td className="border border-black p-1 font-semibold">Nama Terang</td>
            <td className="border border-black p-1 text-center font-bold">{data.pejabat.pelaksana?.nama || ''}</td>
            <td className="border border-black p-1 text-center font-bold">{data.pejabat.wakil_adm?.nama || ''}</td>
            <td className="border border-black p-1 text-center font-bold">{data.pejabat.kepala_tpk?.nama || ''}</td>
            <td className="border border-black p-1 text-center font-bold">{data.pejabat.tu_tpk?.nama || ''}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[9px] italic">*) Coret yang tidak perlu.</p>
    </div>
  )
}

// ── Tumpuk Kapling body (group per jenis → sortimen, filter value > 0) ─
const JENIS_LABEL_TUMPUK = {
  'JATI':           'KAYU JATI',
  'RIMBA_MAHONI':   'MAHONI',
  'RIMBA_KEDAWUNG': 'KEDAWUNG',
}
const JENIS_ORDER = ['JATI', 'RIMBA_MAHONI', 'RIMBA_KEDAWUNG']
const SORTIMEN_LABEL = { AI: 'A I', AII: 'A II', AIII: 'A III' }
const SORTIMEN_ORDER = ['AI', 'AII', 'AIII']

function TumpukKaplingBody({ data, grand, formatAngka, formatAngkaFisik }) {
  // Group tumpuk_kapling by jenis → sortimen, filter volume > 0
  const t = data.tumpuk || []
  const groups = JENIS_ORDER
    .map(jenis => {
      const items = SORTIMEN_ORDER
        .map(sort => {
          const r = t.find(x => x.jenis === jenis && x.sortimen === sort)
          return r ? { sortimen: sort, volume: r.volume||0, tarif: r.tarif||0 } : null
        })
        .filter(s => s && s.volume > 0)
      const subVol = items.reduce((s,x) => s + x.volume, 0)
      const subNilai = items.reduce((s,x) => s + x.volume * x.tarif, 0)
      return { jenis, label: JENIS_LABEL_TUMPUK[jenis] || jenis, items, subVol, subNilai }
    })
    .filter(g => g.items.length > 0)

  // Brongkol (KA) — single line, filter value > 0
  const b = data.brongkol || []
  const brongkolVol   = b.reduce((s,r) => s + (r.volume||0), 0)
  const brongkolNilai = b.reduce((s,r) => s + (r.volume||0)*(r.tarif||0), 0)
  const brongkolTarif = brongkolVol > 0 ? brongkolNilai / brongkolVol : 0
  const showBrongkol = brongkolVol > 0

  return (
    <>
      {/* Title row */}
      <tr>
        <td className="border border-black text-center align-top px-1 py-1"/>
        <td className="border border-black align-top px-2 py-1 font-semibold">BIAYA TUMPUK KAPLING</td>
        <td className="border border-black"/>
        <td className="border border-black"/>
        <td className="border border-black"/>
        <td className="border border-black"/>
        <td className="border border-black"/>
        <td className="border border-black"/>
        <td className="border border-black"/>
      </tr>

      {/* Per jenis */}
      {groups.map((g) => (
        <Frag key={g.jenis}>
          {/* Jenis header */}
          <tr>
            <td className="border border-black"/>
            <td className="border border-black px-2 py-1 font-semibold">{g.label}</td>
            <td className="border border-black"/>
            <td className="border border-black"/>
            <td className="border border-black"/>
            <td className="border border-black"/>
            <td className="border border-black"/>
            <td className="border border-black"/>
            <td className="border border-black"/>
          </tr>
          {/* Per sortimen */}
          {g.items.map((s) => (
            <tr key={s.sortimen}>
              <td className="border border-black"/>
              <td className="border border-black px-2 py-1 pl-8">{SORTIMEN_LABEL[s.sortimen] || s.sortimen}</td>
              <td className="border border-black text-right px-1 py-1 tabular-nums">{formatAngkaFisik(s.volume)}</td>
              <td className="border border-black text-right px-1 py-1">{formatAngka(s.tarif)}</td>
              <td className="border border-black text-right px-1 py-1">{formatAngka(Math.round(s.volume * s.tarif))}</td>
              <td className="border border-black"/>
              <td className="border border-black"/>
              <td className="border border-black"/>
              <td className="border border-black"/>
            </tr>
          ))}
          {/* Subtotal jenis */}
          <tr className="font-semibold">
            <td className="border border-black"/>
            <td className="border border-black"/>
            <td className="border border-black text-right px-1 py-1 border-t-2 tabular-nums">{formatAngkaFisik(g.subVol)}</td>
            <td className="border border-black"/>
            <td className="border border-black text-right px-1 py-1 border-t-2">{formatAngka(Math.round(g.subNilai))}</td>
            <td className="border border-black"/>
            <td className="border border-black text-right px-1 py-1">{formatAngka(Math.round(g.subNilai))}</td>
            <td className="border border-black"/>
            <td className="border border-black text-right px-1 py-1">{formatAngka(Math.round(g.subNilai))}</td>
          </tr>
        </Frag>
      ))}

      {/* Brongkol (KA) */}
      {showBrongkol && (
        <tr>
          <td className="border border-black"/>
          <td className="border border-black px-2 py-1 font-semibold">KA</td>
          <td className="border border-black text-right px-1 py-1 tabular-nums">{formatAngkaFisik(brongkolVol)}</td>
          <td className="border border-black text-right px-1 py-1">{formatAngka(brongkolTarif)}</td>
          <td className="border border-black text-right px-1 py-1">{formatAngka(Math.round(brongkolNilai))}</td>
          <td className="border border-black"/>
          <td className="border border-black text-right px-1 py-1">{formatAngka(Math.round(brongkolNilai))}</td>
          <td className="border border-black"/>
          <td className="border border-black text-right px-1 py-1">{formatAngka(Math.round(brongkolNilai))}</td>
        </tr>
      )}

      {/* Spacer */}
      <tr><td colSpan={9} className="border border-black h-3"/></tr>

      {/* Jumlah Rp */}
      <tr className="font-bold">
        <td colSpan={4} className="border border-black px-2 py-1 text-right">Jumlah Rp.</td>
        <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
        <td className="border border-black text-center">-</td>
        <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
        <td className="border border-black text-center">-</td>
        <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
      </tr>
    </>
  )
}

// ── helpers ─────────────────────────────────────────────
function KodeRow({ digits, amount, bold }) {
  return (
    <div className="flex items-center gap-1">
      <div className="grid grid-cols-6 gap-[1px]">
        {digits.map((d,i) => (
          <div key={i} className="border border-black w-4 h-4 text-center text-[10px] font-bold leading-[14px]">
            {d || ' '}
          </div>
        ))}
      </div>
      <span className="text-[10px]">Rp.</span>
      <span className={`flex-1 text-right tabular-nums ${bold ? 'font-bold' : ''}`}>{amount || ''}</span>
    </div>
  )
}

function computeSubRows(subSrc, data, totalFisik) {
  if (!subSrc) return null
  const t = data.tumpuk || []
  const get = (jenis) => t.filter(r => r.jenis === jenis).reduce((s,r) => s + (r.volume||0), 0)
  let result = []

  if (subSrc === 'tumpuk') {
    result = [
      { label: 'JATI',     fisik: get('JATI') },
      { label: 'MAHONI',   fisik: get('RIMBA_MAHONI') },
      { label: 'KEDAWUNG', fisik: get('RIMBA_KEDAWUNG') },
    ]
  } else if (subSrc === 'tumpuk_slag') {
    result = [
      { label: 'JATI',   fisik: get('JATI') },
      { label: 'MAHONI', fisik: get('RIMBA_MAHONI') },
    ]
  } else if (subSrc === 'tanda_laku') {
    const tl = data.tandaLaku || []
    const grouped = {}
    tl.forEach(r => { grouped[r.jenis] = (grouped[r.jenis]||0) + (r.volume||0) })
    result = Object.entries(grouped).map(([k,v]) => ({ label: k, fisik: v }))
  } else if (subSrc === 'barcode') {
    const bc = data.barcode || []
    const grouped = {}
    bc.forEach(r => { grouped[r.jenis] = (grouped[r.jenis]||0) + (r.jumlah||0) })
    const ORDER = ['JATI','MAHONI','KEDAWUNG']
    const sorted = Object.entries(grouped).sort(([a],[b]) => {
      const ai = ORDER.indexOf(a), bi = ORDER.indexOf(b)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
    result = sorted.map(([k,v]) => ({ label: k, fisik: v }))
  }

  // Filter: hanya tampilkan sub-row yang punya value (>0)
  return result.filter(r => (r.fisik||0) > 0)
}
