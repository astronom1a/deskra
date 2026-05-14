import { useEffect, useState } from 'react'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, terbilangBungkus, formatTanggalTtd } from './cetakHelpers'
import { resolvePejabatForPeriode } from '../../lib/pejabatSnapshot'
import { getTpkNameUpper } from '../../lib/effectiveTpk'

const TIMES = { fontFamily: '"Times New Roman", Times, serif' }

export default function CetakGabunganPembayaran() {
  return (
    <CetakLayout title="Cetak Gabungan Pembayaran">
      {(periode) => <GPDoc periode={periode} />}
    </CetakLayout>
  )
}

function GPDoc({ periode }) {
  const [data, setData] = useState(null)
  const tpkUpper = getTpkNameUpper(periode)

  useEffect(() => {
    (async () => {
      const [rows, pejabatRes] = await Promise.all([
        buildRows(periode.id, periode.periode, { tpkId: periode.tpk_id }),
        resolvePejabatForPeriode(periode),
      ])
      const pejabat = pejabatRes || {}
      setData({ rows, pejabat })
    })()
  }, [periode])

  if (!data) return <CetakPageSkeleton />

  const { rows, pejabat } = data
  const grand = Math.round(rows.reduce((s, r) => s + (r.fisik || 0) * (r.tarif || 0), 0))
  const tglTtd = formatTanggalTtd(periode.tgl_akhir)
  const noBukti = `${periode.periode}`

  // Kode rek default: "1 1 4 2 1 1" (sesuai referensi GP)
  const kodeRekDigits = ['1', '1', '4', '2', '1', '1']
  const kodeRekKosong = ['', '', '', '', '', '']

  return (
    <div className="text-[10.5px] leading-tight text-black" style={TIMES}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-2 items-start mb-2">
        <div className="col-span-2">
          <img
            src="/logo-perhutani.png"
            alt="Perhutani"
            className="h-12 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
          />
        </div>
        <div className="col-span-6 pt-1">
          <p className="font-bold text-[12px]">PERUSAHAAN UMUM KEHUTANAN NEGARA</p>
          <p className="font-bold text-[12px]">(PERUM PERHUTANI)</p>
        </div>
        <div className="col-span-4">
          <div className="bg-gray-200 border border-black text-center font-bold text-[12px] py-1">
            KUITANSI PEMBAYARAN
          </div>
        </div>
      </div>

      <hr className="border-t border-black mb-2" />

      {/* ── Info atas: Telah Terima (kiri) + Kode Rek (kanan) ── */}
      <div className="grid grid-cols-12 gap-3 mb-3">
        <div className="col-span-7 space-y-1">
          <p>Telah Terima dari :</p>
          <p>N a m a &nbsp;&nbsp;&nbsp;: BENDAHARA UMUM PERHUTANI KPH.BWI.UTARA</p>
          <p className="border-b border-dotted border-black h-3"></p>
          <p>Alamat &nbsp;&nbsp;&nbsp;: JL.J.A.SUPRAPTO NO.34 BANYUWANGI</p>
          <p className="border-b border-dotted border-black h-3"></p>
        </div>
        <div className="col-span-5 text-[10px]">
          <p className="mb-1">Nomor Bukti : ……….. <span className="font-semibold">{noBukti}</span></p>
          <p className="mb-1">Kode Rekening dan Rupiah :</p>
          <KodeRekBox digits={kodeRekKosong} amount={formatAngka(grand)} suffix="UK" />
          <KodeRekBox digits={kodeRekKosong} amount="-" suffix="UM" />
          <KodeRekBox digits={kodeRekDigits} amount={formatAngka(grand)} bold />
          <p className="mt-1">Rp. ………………………………</p>
          <p>Rp. ………………………………</p>
          <p>Rp. ………………………………</p>
          <p className="mt-2">Rekening Lawan : …………………………………..</p>
        </div>
      </div>

      {/* ── Banyaknya Uang ─────────────────────────────── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="whitespace-nowrap">Banyaknya Uang :</span>
        <div className="flex-1 border border-black px-3 py-1 font-bold text-center">
          {terbilangBungkus(grand)}
        </div>
      </div>

      <p className="mb-1">Untuk Pembayaran :</p>

      {/* ── Tabel pembayaran ──────────────────────────── */}
      <table className="w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr className="text-center align-middle bg-gray-50">
            <th className="border border-black p-1 w-[5%]">No.</th>
            <th className="border border-black p-1">Uraian Pembayaran</th>
            <th className="border border-black p-1 w-[8%]">Volume</th>
            <th className="border border-black p-1 w-[8%]">Tarif<br/>(Rp.)</th>
            <th className="border border-black p-1 w-[11%]">Pembayaran<br/>Pokok (Rp)</th>
            <th className="border border-black p-1 w-[7%]">PPN<br/>(Rp.)</th>
            <th className="border border-black p-1 w-[11%]">Pembayaran<br/>Kotor (Rp.)</th>
            <th className="border border-black p-1 w-[7%]">PPh<br/>(Rp.)</th>
            <th className="border border-black p-1 w-[11%]">Pembayaran<br/>Bersih (Rp.)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black px-1 text-center align-top">1.</td>
            <td className="border border-black px-2 align-top">
              Bayar Uang Kerja periode<br/>
              <span className="font-bold">{periode.periode}</span><br/>
              <span className="font-bold">GABUNGAN {tpkUpper}</span>
            </td>
            <td className="border border-black text-center align-top">-</td>
            <td className="border border-black text-center align-top">-</td>
            <td className="border border-black text-right px-1 align-top">{formatAngka(grand)}</td>
            <td className="border border-black text-center align-top">-</td>
            <td className="border border-black text-right px-1 align-top">{formatAngka(grand)}</td>
            <td className="border border-black text-center align-top">-</td>
            <td className="border border-black text-right px-1 align-top">{formatAngka(grand)}</td>
          </tr>
          {/* Spacer rows untuk meniru tinggi PDF */}
          <tr><td className="border border-black h-4" colSpan={9}></td></tr>
          <tr className="font-bold">
            <td colSpan={4} className="border border-black px-2 py-1 text-right">Jumlah Rp.</td>
            <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
            <td className="border border-black text-center">-</td>
            <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
            <td className="border border-black text-center">-</td>
            <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Total highlight ───────────────────────────── */}
      <div className="flex items-center gap-3 mt-3 mb-3">
        <span>Jumlah Rp.</span>
        <div className="bg-emerald-100 border border-emerald-700 px-6 py-1 font-bold text-[12px]">
          {formatAngka(grand)}
        </div>
      </div>

      {/* ── Footer 5 kolom ttd ────────────────────────── */}
      <table className="w-auto border-collapse border  border-black text-[10px]">
        <tbody>
          <tr>
            <td className="border border-black p-1 w-[10%] align-center">Keterangan</td>
            <td className="border border-black p-1 w-[20%] align-top text-center">
              Barang/Jasa/Pekerjaan telah<br/>diterima/dikerjakan dengan baik
            </td>
            <td className="border border-black p-1 w-[22%] align-top text-center">Mengetahui / Setuju :</td>
            <td className="border border-black p-1 w-[22%] align-top text-center">Boleh Dibayar :</td>
            <td className="border border-black p-1 w-[24%] align-top text-center">
              Yang menerima /<br/>Membayar *)
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1">Tempat tgl</td>
            <td className="border border-black p-1 text-center">BANYUWANGI, {tglTtd}</td>
            <td className="border border-black p-1 text-center">BANYUWANGI, {tglTtd}</td>
            <td className="border border-black p-1 text-center">BANYUWANGI, {tglTtd}</td>
            <td className="border border-black p-1 text-center">BANYUWANGI, {tglTtd}</td>
          </tr>
          <tr>
            <td className="border border-black p-1">Jabatan</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 text-center">PENGGUNA ANGGARAN</td>
            <td className="border border-black p-1 text-center">BENDAHARA UMUM</td>
            <td className="border border-black p-1 text-center">BENDAHARA PENGELUARAN</td>
          </tr>
          <tr>
            <td className="border border-black p-1">Tanda tangan</td>
            <td className="border border-black p-1 h-14"></td>
            <td className="border border-black p-1 h-14"></td>
            <td className="border border-black p-1 h-14"></td>
            <td className="border border-black p-1 h-14"></td>
          </tr>
          <tr>
            <td className="border border-black p-1">Nama Terang</td>
            <td className="border border-black p-1"></td>
            <td className="border border-black p-1 text-center font-bold">{pejabat.pengguna_anggaran?.nama || ''}</td>
            <td className="border border-black p-1 text-center font-bold">{pejabat.bendahara_umum?.nama || ''}</td>
            <td className="border border-black p-1 text-center font-bold">{pejabat.bendahara_pengeluaran?.nama || ''}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-1 text-[9px]">*) Coret yang tidak perlu</p>
    </div>
  )
}

function KodeRekBox({ digits, amount, suffix, bold }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <table className="border-collapse">
        <tbody>
          <tr>
            {digits.map((d, i) => (
              <td key={i} className="border border-black w-5 h-5 text-center text-[10px] font-bold">
                {d || ' '}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <span className={`min-w-[60px] text-right ${bold ? 'font-bold' : ''}`}>{amount}</span>
      {suffix && <span className="text-[10px]">{suffix}</span>}
    </div>
  )
}
