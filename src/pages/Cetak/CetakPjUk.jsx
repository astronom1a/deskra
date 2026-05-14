import { useEffect, useState } from 'react'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, formatTanggalTtd } from './cetakHelpers'
import { resolvePejabatForPeriode } from '../../lib/pejabatSnapshot'
import { getTpkNameUpper } from '../../lib/effectiveTpk'

const ARIAL   = { fontFamily: 'Arial, Helvetica, sans-serif' }
const CALIBRI = { fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }

const GROUP_LABEL = {
  '51.69.43': 'Biaya penomeran sabuk tanda laku',
  '51.69.44': 'Biaya Tumpuk Kapling',
  '51.69.91': 'Biaya sarpra kantor tpk lainnya',
}
const GROUP_ORDER = ['51.69.44', '51.69.43', '51.69.91']

export default function CetakPjUk() {
  return (
    <CetakLayout title="Cetak PJ UK" landscape>
      {(periode) => <PjUkDoc periode={periode}/>}
    </CetakLayout>
  )
}

function PjUkDoc({ periode }) {
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

  if (!data) return <CetakPageSkeleton landscape />

  const { rows, pejabat } = data
  const grand = Math.round(rows.reduce((s,r) => s + (r.fisik||0)*(r.tarif||0), 0))

  // Group pengeluaran per kode_rek (urutan: 44, 43, 91)
  const totals = {}
  for (const r of rows) {
    const key = r.kode_rek || '-'
    const nilai = Math.round((r.fisik||0) * (r.tarif||0))
    totals[key] = (totals[key]||0) + nilai
  }
  const pengeluaran = GROUP_ORDER
    .filter(k => (totals[k]||0) > 0)
    .map(k => ({ kode_rek:k, uraian:GROUP_LABEL[k], total:totals[k] }))
  const totalPengeluaran = pengeluaran.reduce((s,g)=>s+g.total,0)

  // Samakan jumlah baris kanan-kiri secara dinamis (ikut sisi terbanyak)
  const penerimaanCount = 1 // 1 baris Uang Kerja
  const maxRows = Math.max(penerimaanCount, pengeluaran.length)
  const padPenerimaan  = Math.max(0, maxRows - penerimaanCount)
  const padPengeluaran = Math.max(0, maxRows - pengeluaran.length)

  const tglTtd = formatTanggalTtd(periode.tgl_akhir)

  return (
    <div className="text-[10.5px] leading-tight text-black" style={CALIBRI}>
      {/* ── Header (Arial) ─────────────────────────────── */}
      <div className="mb-3" style={ARIAL}>
        <div className="text-center mb-2">
          <p className="font-bold text-[13px]">PERTANGGUNG JAWABAN UANG KAS</p>
          <p>PERIODE&nbsp;: <span className="font-bold">{periode.periode}</span></p>
        </div>
        <div>
          <p className="font-bold text-[12px]">PERUM PERHUTANI</p>
          <p>KPH : <span className="font-bold">BANYUWANGI UTARA</span></p>
          <p>TPK : <span className="font-bold">{tpkUpper}</span></p>
        </div>
      </div>

      {/* ── Dua tabel: Penerimaan (kiri) & Pengeluaran (kanan) ── */}
      <div className="grid grid-cols-2 items-start gap-3 w-full">
        {/* Penerimaan */}
        <div className="w-full">
          <p className="italic mb-1">Penerimaan :</p>
          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="text-center">
                <th className="border border-black px-2 py-1">No</th>
                <th className="border border-black px-2 py-1">Uraian</th>
                <th className="border border-black px-2 py-1">Kode Rek</th>
                <th className="border border-black px-2 py-1">Uang Kerja /<br/>Penerimaan</th>
                <th className="border border-black px-2 py-1">Macam-2<br/>Penerimaan</th>
                <th className="border border-black px-2 py-1">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black text-center align-top">1</td>
                <td className="border border-black px-1 align-top">
                  Uang Kerja Perd<br/>{periode.periode}
                </td>
                <td className="border border-black text-center align-top">11.42.11</td>
                <td className="border border-black text-right px-1 align-top">{formatAngka(grand)}</td>
                <td className="border border-black text-center align-top">-</td>
                <td className="border border-black text-right px-1 align-top">{formatAngka(grand)}</td>
              </tr>
              {Array.from({length:padPenerimaan}).map((_,i)=>(
                <tr key={i}>
                  <td className="border border-black h-4"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black text-right px-1">-</td>
                  <td className="border border-black text-right px-1">-</td>
                  <td className="border border-black text-right px-1">-</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={3} className="border border-black px-1 text-center">JUMLAH</td>
                <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
                <td className="border border-black text-right px-1">-</td>
                <td className="border border-black text-right px-1">{formatAngka(grand)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pengeluaran */}
        <div className="w-full">
          <p className="italic mb-1">Pengeluaran :</p>
          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="text-center">
                <th className="border border-black px-2 py-1">No</th>
                <th className="border border-black px-2 py-1">Uraian</th>
                <th className="border border-black px-2 py-1">Kode Rek</th>
                <th className="border border-black px-2 py-1">Uang Kerja /<br/>Penerimaan</th>
                <th className="border border-black px-2 py-1">Macam-2<br/>Penerimaan</th>
                <th className="border border-black px-2 py-1">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {pengeluaran.map((g,i)=>(
                <tr key={g.kode_rek}>
                  <td className="border border-black text-center align-top">{i+1}</td>
                  <td className="border border-black px-1 align-top">{g.uraian}</td>
                  <td className="border border-black text-center align-top">{g.kode_rek}</td>
                  <td className="border border-black text-right px-1 align-top">{formatAngka(g.total)}</td>
                  <td className="border border-black text-center align-top">-</td>
                  <td className="border border-black text-right px-1 align-top">{formatAngka(g.total)}</td>
                </tr>
              ))}
              {Array.from({length:padPengeluaran}).map((_,i)=>(
                <tr key={i}>
                  <td className="border border-black h-4"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black text-right px-1">-</td>
                  <td className="border border-black text-right px-1">-</td>
                  <td className="border border-black text-right px-1">-</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td colSpan={3} className="border border-black px-1 text-center">JUMLAH</td>
                <td className="border border-black text-right px-1">{formatAngka(totalPengeluaran)}</td>
                <td className="border border-black text-right px-1">-</td>
                <td className="border border-black text-right px-1">{formatAngka(totalPengeluaran)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Tanda tangan ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mt-10 text-[11px]">
        <div>
          <p>Mengetahui</p>
          <p>PENGGUNA ANGGARAN</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.pengguna_anggaran?.nama || ' '}</p>
        </div>
        <div>
          <p>Setuju dibayar</p>
          <p>BENDAHARA UMUM</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.bendahara_umum?.nama || ' '}</p>
        </div>
        <div>
          <p>BANYUWANGI, {tglTtd}</p>
          <p>BENDAHARA PENGELUARAN</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.bendahara_pengeluaran?.nama || ' '}</p>
        </div>
      </div>
    </div>
  )
}
