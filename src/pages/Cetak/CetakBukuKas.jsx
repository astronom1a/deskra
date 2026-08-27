import { useEffect, useState } from 'react'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, formatTanggalLengkap, parsePeriode } from './cetakHelpers'
import { resolvePejabatForPeriode } from '../../lib/pejabatSnapshot'

const TIMES = { fontFamily: 'Arial, Helvetica, sans-serif' }
const HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU']
const RIMBA_KEYS = ['tumpuk_mahoni', 'tumpuk_kedawung', 'tumpuk_johar', 'tumpuk_klampis', 'tumpuk_rimba_campuran']
const BARCODE_KEYS = ['barcode_jati', 'barcode_mahoni', 'barcode_kedawung']

export default function CetakBukuKas() {
  return (
    <CetakLayout title="Cetak Buku KAS">
      {(periode) => <BukuKasDoc periode={periode} />}
    </CetakLayout>
  )
}

function BukuKasDoc({ periode }) {
  const [data, setData] = useState(null)
  const [saldoBuku, setSaldoBuku] = useState('')
  const [saldoNyata, setSaldoNyata] = useState('')
  const [saldoBeda, setSaldoBeda] = useState('')

  useEffect(() => {
    (async () => {
      const [rows, pejabatRes] = await Promise.all([
        buildRows(periode.id, periode.periode, { tpkId: periode.tpk_id }),
        resolvePejabatForPeriode(periode),
      ])
      setData({ rows, pejabat: pejabatRes || {} })
    })()
  }, [periode])

  if (!data) return <CetakPageSkeleton />

  const { rows, pejabat } = data
  const nilaiOf = (row) => Math.round((row?.fisik || 0) * (row?.tarif || 0))
  const findRow = (key) => rows.find(r => r._key === key) || {}

  const simpleItems = [
    ['penomoran', 'PENOMORAN KAPLING'],
    ['sabuk', 'SABUK KAPLING'],
    ['tanda_laku', 'TANDA LAKU'],
    ['slaghammer', 'SLAGHAMMER'],
  ].map(([key, label]) => ({ label, nilai: nilaiOf(findRow(key)) }))

  const jatiNilai = nilaiOf(findRow('tumpuk_jati'))
  const rimbaNilai = RIMBA_KEYS.reduce((s, k) => s + nilaiOf(findRow(k)), 0)
  const brongkolNilai = nilaiOf(findRow('brongkol'))
  const barcodeNilai = BARCODE_KEYS.reduce((s, k) => s + nilaiOf(findRow(k)), 0)
  const tumpukItems = [
    { label: 'TUMPUK KAPLING JATI', nilai: jatiNilai },
    { label: 'TUMPUK KAPLING RIMBA', nilai: rimbaNilai },
    { label: 'TUMPUK BRONGKOL', nilai: brongkolNilai },
    { label: 'PEMASANGAN BARCODE', nilai: barcodeNilai },
  ]

  const lainnyaItems = ['tenaga', 'kebersihan', 'listrik']
    .map(key => findRow(key))
    .filter(row => row.uraian)
    .map(row => ({ label: row.uraian, nilai: nilaiOf(row) }))

  const customItems = rows
    .filter(r => r._key?.startsWith('custom_'))
    .map(row => ({ label: row.uraian, nilai: nilaiOf(row) }))

  const pengeluaranItems = [...simpleItems, ...tumpukItems, ...lainnyaItems, ...customItems]
    .filter(x => x.nilai > 0)
    .map((x, i) => ({ ...x, no: i + 1 }))

  const grand = Math.round(rows.reduce((s, r) => s + (r.fisik || 0) * (r.tarif || 0), 0))
  const perd = parsePeriode(periode.periode)
  const tglAkhirDate = periode.tgl_akhir ? new Date(periode.tgl_akhir) : null
  const hariNama = tglAkhirDate ? HARI[tglAkhirDate.getDay()] : ''
  const tglAwalUpper = formatTanggalLengkap(periode.tgl_awal).toUpperCase()
  const tglAkhirUpper = formatTanggalLengkap(periode.tgl_akhir).toUpperCase()
  const tpkNama = periode?.tabel_tpk?.namatpk || periode?.tpk?.namatpk || ''

  const saldoText = (v) => {
    const n = Number(String(v).replace(/[^0-9-]/g, ''))
    return v !== '' && !Number.isNaN(n) ? `Rp. ${formatAngka(n)}` : 'N I H I L'
  }

  return (
    <div className="text-[10.5px] leading-tight text-black" style={TIMES}>
      {/* Kontrol saldo kas — hanya tampil di layar, tidak ikut cetak */}
      <div className="print:hidden flex flex-wrap items-center gap-3 mb-3 p-2 border border-dashed border-gray-300 bg-gray-50 text-[11px]">
        <span className="font-semibold text-gray-500">Saldo kas penutup (opsional, kosongkan jika NIHIL):</span>
        <label className="flex items-center gap-1">Buku KAS
          <input type="number" value={saldoBuku} onChange={e => setSaldoBuku(e.target.value)}
            className="border border-gray-300 rounded px-1 py-0.5 w-28" placeholder="0" />
        </label>
        <label className="flex items-center gap-1">Sebenarnya
          <input type="number" value={saldoNyata} onChange={e => setSaldoNyata(e.target.value)}
            className="border border-gray-300 rounded px-1 py-0.5 w-28" placeholder="0" />
        </label>
        <label className="flex items-center gap-1">Perbedaan
          <input type="number" value={saldoBeda} onChange={e => setSaldoBeda(e.target.value)}
            className="border border-gray-300 rounded px-1 py-0.5 w-28" placeholder="0" />
        </label>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 items-center mb-2">
        <div className="col-span-2">
          <img src="/logo-perhutani.png" alt="Perhutani" className="h-12 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }} />
        </div>
        <div className="col-span-6 text-center">
          <p className="font-bold text-[12px]">PERUSAHAAN UMUM KEHUTANAN NEGARA</p>
          <p className="font-bold text-[12px]">(PERUM PERHUTANI)</p>
        </div>
        <div className="col-span-4">
          <div className="bg-gray-200 border border-black text-center font-bold text-[13px] py-1">
            BUKU KAS
          </div>
        </div>
      </div>
      <hr className="border-t border-black mb-2" />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-[10px]">
        <span className="font-semibold">PEMBAYARAN DALAM WAKTU</span>
        <span>No. …………………</span>
        <span>Dari <span className="font-semibold">{tglAwalUpper}</span> s/d <span className="font-semibold">{tglAkhirUpper}</span></span>
      </div>

      {/* Tabel dua kolom: PENERIMAAN (kiri) & PENGELUARAN (kanan) */}
      <table className="w-full border-collapse border border-black text-[10px] table-fixed">
        <thead>
          <tr className="text-center align-middle bg-gray-50">
            <th className="border border-black p-1 w-[9%]">Tgl<br/>Pembukuan</th>
            <th className="border border-black p-1 w-[7%]">No.<br/>Bukti</th>
            <th className="border border-black p-1 w-[24%]">Keterangan Singkat<br/>(PENERIMAAN)</th>
            <th className="border border-black p-1 w-[10%]">Jumlah (Rp)</th>
            <th className="border border-black p-1 w-[9%]">Tgl<br/>Pembukuan</th>
            <th className="border border-black p-1 w-[7%]">No.<br/>Bukti</th>
            <th className="border border-black p-1 w-[24%]">Keterangan Singkat<br/>(PENGELUARAN)</th>
            <th className="border border-black p-1 w-[10%]">Jumlah (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-2 italic">Saldo Kas Periode Lalu</td>
            <td className="border border-black px-1 text-center">N I H I L</td>
            {pengeluaranItems[0] ? (
              <PengeluaranCells item={pengeluaranItems[0]} tgl={periode.tgl_akhir} />
            ) : (
              <>
                <td className="border border-black px-1"></td>
                <td className="border border-black px-1"></td>
                <td className="border border-black px-2 italic">- N I H I L -</td>
                <td className="border border-black px-1"></td>
              </>
            )}
          </tr>
          <tr>
            <td className="border border-black px-1 text-center">{formatTanggalLengkap(periode.tgl_akhir)}</td>
            <td className="border border-black px-1 text-center">1</td>
            <td className="border border-black px-2">
              Uang Kerja Per<br/>
              <span className="font-semibold">{perd.half} / {perd.bulan} / {perd.tahun}</span>
              {tpkNama && <span> — {tpkNama.toUpperCase()}</span>}
            </td>
            <td className="border border-black px-1 text-right font-semibold">{formatAngka(grand)}</td>
            {pengeluaranItems[1] ? (
              <PengeluaranCells item={pengeluaranItems[1]} tgl={periode.tgl_akhir} />
            ) : (
              <>
                <td className="border border-black px-1"></td>
                <td className="border border-black px-1"></td>
                <td className="border border-black px-2"></td>
                <td className="border border-black px-1"></td>
              </>
            )}
          </tr>

          {/* Baris tambahan untuk item pengeluaran ke-3 dst (kiri dikosongkan) */}
          {pengeluaranItems.slice(2).map(item => (
            <tr key={item.no}>
              <td className="border border-black px-1"></td>
              <td className="border border-black px-1"></td>
              <td className="border border-black px-1"></td>
              <td className="border border-black px-1"></td>
              <PengeluaranCells item={item} tgl={periode.tgl_akhir} />
            </tr>
          ))}

          <tr className="font-bold">
            <td className="border border-black px-2 py-1" colSpan={3}>JUMLAH PENERIMAAN</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
            <td className="border border-black px-2 py-1" colSpan={3}>JUMLAH PENGELUARAN</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* Penutup */}
      <div className="mt-3 space-y-1">
        <p>Yang bertanda tangan dibawah ini pada hari <span className="font-semibold">{hariNama}</span> tanggal <span className="font-semibold">{tglAkhirUpper}</span></p>
        <p>Buku KAS ditutup dengan keuangan sebagai berikut :</p>
        <ol className="list-none pl-4 space-y-0.5">
          <li>1. Sisa uang kas menurut keadaan yang sebenarnya adalah &nbsp; <span className="font-semibold">{saldoText(saldoNyata)}</span></li>
          <li>2. Sisa uang kas menurut Buku KAS adalah &nbsp; <span className="font-semibold">{saldoText(saldoBuku)}</span></li>
          <li>3. Perbedaan uang kas menurut Buku KAS adalah &nbsp; <span className="font-semibold">{saldoText(saldoBeda)}</span></li>
          <li>4. Perbedaan ini disebabkan karena …………………………………………………………………</li>
          <li>5. Sisa uang kas terdiri dari alat pembayaran yang sah dan diperkenankan</li>
          <li>6. Pembayaran meliputi tutupan pembayaran uang kerja dari tanggal {tglAwalUpper} s/d {tglAkhirUpper}</li>
        </ol>
      </div>

      {/* Tanda tangan */}
      <table className="w-full border-collapse border border-black text-[10px] mt-3">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 text-center w-1/3">Mengetahui</td>
            <td className="border border-black px-2 py-1 text-center w-1/3">Setuju Dibayar</td>
            <td className="border border-black px-2 py-1 text-center w-1/3">Banyuwangi, {tglAkhirUpper}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 text-center font-semibold">PENGGUNA ANGGARAN</td>
            <td className="border border-black px-2 py-1 text-center font-semibold">BENDAHARA UMUM</td>
            <td className="border border-black px-2 py-1 text-center font-semibold">BENDAHARA PENGELUARAN</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 h-16"></td>
            <td className="border border-black px-2 py-1 h-16"></td>
            <td className="border border-black px-2 py-1 h-16"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 text-center font-bold underline">{pejabat.pengguna_anggaran?.nama || ''}</td>
            <td className="border border-black px-2 py-1 text-center font-bold underline">{pejabat.bendahara_umum?.nama || ''}</td>
            <td className="border border-black px-2 py-1 text-center font-bold underline">{pejabat.bendahara_pengeluaran?.nama || ''}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1 text-center">{pejabat.pengguna_anggaran?.npk ? `NPK. ${pejabat.pengguna_anggaran.npk}` : ''}</td>
            <td className="border border-black px-2 py-1 text-center">{pejabat.bendahara_umum?.npk ? `NPK. ${pejabat.bendahara_umum.npk}` : ''}</td>
            <td className="border border-black px-2 py-1 text-center">{pejabat.bendahara_pengeluaran?.npk ? `NPK. ${pejabat.bendahara_pengeluaran.npk}` : ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PengeluaranCells({ item, tgl }) {
  return (
    <>
      <td className="border border-black px-1 text-center">{formatTanggalLengkap(tgl)}</td>
      <td className="border border-black px-1 text-center">{item.no}</td>
      <td className="border border-black px-2">By. {item.label}</td>
      <td className="border border-black px-1 text-right font-semibold">{formatAngka(item.nilai)}</td>
    </>
  )
}
