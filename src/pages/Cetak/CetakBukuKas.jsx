import { useEffect, useState, useRef, useLayoutEffect } from 'react'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, formatTanggalLengkap, formatTanggalSingkat, parsePeriode } from './cetakHelpers'
import { resolvePejabatForPeriode } from '../../lib/pejabatSnapshot'

const TIMES = { fontFamily: 'Arial, Helvetica, sans-serif' }
const HARI = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', "JUM'AT", 'SABTU']
const RIMBA_KEYS = ['tumpuk_mahoni', 'tumpuk_kedawung', 'tumpuk_johar', 'tumpuk_klampis', 'tumpuk_rimba_campuran']
const BARCODE_KEYS = ['barcode_jati', 'barcode_mahoni', 'barcode_kedawung']

export default function CetakBukuKas() {
  return (
    <CetakLayout title="Cetak Buku KAS" autoPageSize landscape>
      {(periode) => <BukuKasDoc periode={periode} />}
    </CetakLayout>
  )
}

function BukuKasDoc({ periode }) {
  const [data, setData] = useState(null)
  const [saldoBuku, setSaldoBuku] = useState('')
  const [saldoNyata, setSaldoNyata] = useState('')
  const [saldoBeda, setSaldoBeda] = useState('')
  const tableRef = useRef(null)
  const [colLines, setColLines] = useState([])

  useEffect(() => {
    (async () => {
      const [rows, pejabatRes] = await Promise.all([
        buildRows(periode.id, periode.periode, { tpkId: periode.tpk_id }),
        resolvePejabatForPeriode(periode),
      ])
      setData({ rows, pejabat: pejabatRes || {} })
    })()
  }, [periode])

  // Ukur posisi asli batas kolom tabel (bukan hitung % sendiri) — table-fixed membulatkan lebar tiap kolom,
  // jadi garis lanjutan di bawah tabel harus mengikuti render aslinya supaya sejajar persis, bukan hasil hitungan paralel.
  useLayoutEffect(() => {
    if (!data) return
    const measure = () => {
      const table = tableRef.current
      const firstRow = table?.querySelector('tbody tr')
      if (!table || !firstRow) return
      const tableLeft = table.getBoundingClientRect().left
      const offsets = [...firstRow.children].map(td => td.getBoundingClientRect().left - tableLeft)
      setColLines(offsets.slice(1))
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('beforeprint', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('beforeprint', measure)
    }
  }, [data])

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
    { label: 'TUMPUK KAPLING', nilai: jatiNilai },
    { label: 'TUMPUK KAPLING', nilai: rimbaNilai },
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

      {/* Tabel dua kolom: PENERIMAAN (kiri) & PENGELUARAN (kanan) — mengikuti model Blanko KAS */}
      <table ref={tableRef} className="w-full border-collapse border border-black text-[9px] table-fixed">
        {/* table-fixed hanya menghormati lebar kolom dari <colgroup> / baris pertama — lebar di baris subheader (Jenis/Tgl/No/dst) diabaikan browser tanpa ini */}
        <colgroup>
          <col className="w-[7%]" /><col className="w-[4%]" /><col className="w-[7%]" /><col className="w-[3%]" />
          <col className="w-[13%]" /><col className="w-[6%]" /><col className="w-[5%]" /><col className="w-[6%]" />
          <col className="w-[7%]" /><col className="w-[4%]" /><col className="w-[7%]" /><col className="w-[3%]" />
          <col className="w-[13%]" /><col className="w-[6%]" /><col className="w-[5%]" /><col className="w-[6%]" />
        </colgroup>
        <thead>
          <tr className="text-center align-middle bg-gray-50">
            <th rowSpan={2} className="border border-black p-1">Tanggal<br/>Pembukuan</th>
            <th colSpan={3} className="border border-black p-1">Surat Bukti</th>
            <th rowSpan={2} className="border border-black p-1 break-words">Keterangan Singkat dari<br/>(PENERIMAAN)</th>
            <th colSpan={2} className="border border-black p-1">Bukti Kas No.</th>
            <th rowSpan={2} className="border border-black p-1">Jumlah (Rp)</th>

            <th rowSpan={2} className="border border-black p-1">Tanggal<br/>Pembukuan</th>
            <th colSpan={3} className="border border-black p-1">Surat Bukti</th>
            <th rowSpan={2} className="border border-black p-1 break-words">Keterangan Singkat dari<br/>(PENGELUARAN)</th>
            <th colSpan={2} className="border border-black p-1">Bukti Kas No.</th>
            <th rowSpan={2} className="border border-black p-1">Jumlah (Rp)</th>
          </tr>
          <tr className="text-center align-middle bg-gray-50">
            <th className="border border-black p-1">Jenis</th>
            <th className="border border-black p-1">Tgl</th>
            <th className="border border-black p-1">No</th>
            <th className="border border-black p-1">Persekot</th>
            <th className="border border-black p-1">Peng<br/>hasilan</th>

            <th className="border border-black p-1">Jenis</th>
            <th className="border border-black p-1">Tgl</th>
            <th className="border border-black p-1">No</th>
            <th className="border border-black p-1">Persekot</th>
            <th className="border border-black p-1">Peng<br/>hasilan</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-8">
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-2 italic">Saldo Kas Periode Lalu</td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1 text-center">N I H I L</td>
            {pengeluaranItems.length === 0 ? (
              <EmptyPengeluaranCells label="- N I H I L -" italic />
            ) : (
              <EmptyPengeluaranCells />
            )}
          </tr>
          <tr className="h-8">
            <td className="border border-black px-1 text-center">{formatTanggalSingkat(periode.tgl_akhir)}</td>
            <td className="border border-black px-1 text-center">Kwit</td>
            <td className="border border-black px-1 text-center">{formatTanggalSingkat(periode.tgl_akhir)}</td>
            <td className="border border-black px-1 text-center">1</td>
            <td className="border border-black px-2 break-words">
              Uang Kerja Per {perd.half}/{perd.bulan}/{perd.tahun}
              {tpkNama && <span> — {tpkNama.toUpperCase()}</span>}
            </td>
            <td className="border border-black px-1 text-right font-semibold">{formatAngka(grand)}</td>
            <td className="border border-black px-1"></td>
            <td className="border border-black px-1 text-right font-semibold">{formatAngka(grand)}</td>
            {pengeluaranItems[0] ? (
              <PengeluaranCells item={pengeluaranItems[0]} tgl={periode.tgl_akhir} showBukti />
            ) : (
              <EmptyPengeluaranCells />
            )}
          </tr>

          {/* Baris tambahan untuk item pengeluaran ke-2 dst (kiri dikosongkan, kolom Tgl Pembukuan/Jenis/Tgl Bukti dikosongkan) */}
          {pengeluaranItems.slice(1).map(item => (
            <tr key={item.no} className="h-8">
              <EmptyPenerimaanCells />
              <PengeluaranCells item={item} tgl={periode.tgl_akhir} />
            </tr>
          ))}

          <tr className="font-bold h-8">
            <td className="border border-black px-2 py-1" colSpan={7}>JUMLAH PENERIMAAN</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
            <td className="border border-black px-2 py-1" colSpan={7}>JUMLAH PENGELUARAN</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* Grid kolom menerus ke bawah — garis vertikal diambil dari posisi kolom tabel asli (bukan hitung %) supaya sejajar persis & tetap tampak menembus teks penutup + tanda tangan, meniru buku kas fisik */}
      <div className="relative border-l border-r border-b border-black">
        {colLines.map(px => (
          <div key={px} className="absolute top-0 bottom-0 border-l border-black" style={{ left: `${px}px` }}></div>
        ))}

        {/* Penutup */}
        <div className="relative mt-3 mx-2 space-y-1 pb-3">
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
        <div className="relative grid grid-cols-3 gap-2 text-[10px] text-center mt-4 mx-2 pb-3">
          <div>Mengetahui</div>
          <div>Setuju Dibayar</div>
          <div>Banyuwangi, {tglAkhirUpper}</div>

          <div className="font-semibold">PENGGUNA ANGGARAN</div>
          <div className="font-semibold">BENDAHARA UMUM</div>
          <div className="font-semibold">BENDAHARA PENGELUARAN</div>

          <div className="h-16"></div>
          <div className="h-16"></div>
          <div className="h-16"></div>

          <div className="font-bold underline">{pejabat.pengguna_anggaran?.nama || ''}</div>
          <div className="font-bold underline">{pejabat.bendahara_umum?.nama || ''}</div>
          <div className="font-bold underline">{pejabat.bendahara_pengeluaran?.nama || ''}</div>

          <div>{pejabat.pengguna_anggaran?.npk ? `NPK. ${pejabat.pengguna_anggaran.npk}` : ''}</div>
          <div>{pejabat.bendahara_umum?.npk ? `NPK. ${pejabat.bendahara_umum.npk}` : ''}</div>
          <div>{pejabat.bendahara_pengeluaran?.npk ? `NPK. ${pejabat.bendahara_pengeluaran.npk}` : ''}</div>
        </div>
      </div>
    </div>
  )
}

function PengeluaranCells({ item, tgl, showBukti = false }) {
  return (
    <>
      <td className="border border-black px-1 text-center">{showBukti ? formatTanggalSingkat(tgl) : ''}</td>
      <td className="border border-black px-1 text-center">{showBukti ? 'Kwit' : ''}</td>
      <td className="border border-black px-1 text-center">{showBukti ? formatTanggalSingkat(tgl) : ''}</td>
      <td className="border border-black px-1 text-center">{item.no}</td>
      <td className="border border-black px-2 break-words">By. {item.label}</td>
      <td className="border border-black px-1 text-right font-semibold">{formatAngka(item.nilai)}</td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1 text-right font-semibold">{formatAngka(item.nilai)}</td>
    </>
  )
}

function EmptyPengeluaranCells({ label = '', italic = false }) {
  return (
    <>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className={`border border-black px-2 ${italic ? 'italic' : ''}`}>{label}</td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
    </>
  )
}

function EmptyPenerimaanCells() {
  return (
    <>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
      <td className="border border-black px-1"></td>
    </>
  )
}
