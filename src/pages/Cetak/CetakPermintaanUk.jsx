import { useEffect, useState } from 'react'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { fetchCetakData, formatAngka, terbilangBungkus, formatTanggalLengkap, formatTanggalTtd } from './cetakHelpers'
import { getTpkNameUpper } from '../../lib/effectiveTpk'

const TIMES = { fontFamily: 'Arial, Helvetica, sans-serif' }

export default function CetakPermintaanUk() {
  return (
    <CetakLayout title="Cetak Permintaan UK">
      {(periode) => <PermintaanUkDoc periode={periode}/>}
    </CetakLayout>
  )
}

function PermintaanUkDoc({ periode }) {
  const [data, setData] = useState(null)
  const tpkUpper = getTpkNameUpper(periode)
  useEffect(() => { fetchCetakData(periode.id).then(setData) }, [periode.id])
  if (!data) return <CetakPageSkeleton />

  const { grandTotal, pejabat } = data
  const grand = Math.round(grandTotal)
  const tglTtd = formatTanggalTtd(periode.tgl_akhir)
  const rpTerb = (
    <>
      <span className="font-bold">Rp&nbsp;&nbsp;{formatAngka(grand)}</span>
      &nbsp;&nbsp;<span className="font-bold">{terbilangBungkus(grand)}</span>
    </>
  )

  return (
    <div className="text-[12px] leading-snug text-black" style={TIMES}>
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-2 border-b-2 border-black">
        <img
          src="/logo-perhutani.png"
          alt="Perhutani"
          className="h-20 w-auto object-contain"
          onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
        />
        <div className="flex-1 text-center">
          <p className="font-bold text-[22px] leading-tight">PERUM PERHUTANI</p>
          <p className="text-[14px]">(PERUSAHAAN UMUM KEHUTANAN NEGARA)</p>
        </div>
      </div>

      {/* ── Title ───────────────────────────────────────── */}
      <h1 className="text-center font-bold text-[16px] underline mt-5 mb-4">
        DAFTAR PERMINTAAN UANG KERJA
      </h1>

      {/* ── Pembuka ─────────────────────────────────────── */}
      <p className="text-justify">
        Bendahara pengeluaran : <span className="font-bold">{tpkUpper}</span> berdasarkan kegiatan pekerjaan yang akan / telah
        dilaksanakan dalam periode <span className="font-bold">{periode.periode}</span>, masa pembayaran dari tanggal <span className="font-bold">{formatTanggalLengkap(periode.tgl_awal)}</span> sampai
        dengan <span className="font-bold">{formatTanggalLengkap(periode.tgl_akhir)}</span> diperlukan uang kerja dari satuan kantor KPH Banyuwangi Utara sebesar
      </p>

      <div className="ml-4 mt-1 mb-3">{rpTerb}</div>

      <p className="mt-2">Untuk itu perlu kami sampaikan pertelaan sebagai berikut :</p>

      {/* ── Pertelaan ───────────────────────────────────── */}
      <table className="w-full mt-2">
        <tbody>
          <tr>
            <td className="w-10 align-top pl-6">1</td>
            <td className="align-top">
              Rencana pengeluaran selama masa pembayaran<br/>
              <span>(Lihat perincian dibaliknya)</span>
            </td>
            <td className="w-20 align-top text-right font-bold">Rp</td>
            <td className="w-32 align-top text-right font-bold">{formatAngka(grand)}</td>
          </tr>
          <tr><td colSpan={4} className="h-3"/></tr>
          <tr>
            <td className="align-top pl-6">2</td>
            <td className="align-top" colSpan={3}>Rencana penerimaan selama masa pembayaran :</td>
          </tr>
          <tr>
            <td/>
            <td className="pl-6">* Getah</td>
            <td className="text-right font-bold">Rp</td>
            <td className="text-right">-</td>
          </tr>
          <tr>
            <td/>
            <td className="pl-6">* Tebangan</td>
            <td className="text-right font-bold">Rp</td>
            <td className="text-right">-</td>
          </tr>
          <tr><td colSpan={4} className="h-3"/></tr>
          <tr>
            <td className="align-top pl-6">3</td>
            <td className="align-top">Sisa Kas Pembantu tanggal …………</td>
            <td className="text-right font-bold">Rp</td>
            <td className="text-right border-b border-black">-</td>
          </tr>
          <tr>
            <td colSpan={2}/>
            <td className="text-right font-bold pt-1">Rp</td>
            <td className="text-right pt-1">-</td>
          </tr>
          <tr><td colSpan={4} className="h-3"/></tr>
          <tr>
            <td className="align-top pl-6">4</td>
            <td className="align-top">Berdasarkan rincian tersebut, dibutuhkan Uang Kerja sebesar :</td>
            <td className="text-right font-bold">Rp</td>
            <td className="text-right font-bold">{formatAngka(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── TTD atas (Waka & Bendahara Pengeluaran) ─────── */}
      <div className="grid grid-cols-2 mt-8">
        <div>
          <p>Mengetahui</p>
          <p>Waka Administratur</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.waka_administratur?.nama || ' '}</p>
          <p>{pejabat.waka_administratur?.npk ? `NPK.${pejabat.waka_administratur.npk}` : ''}</p>
        </div>
        <div>
          <p>WONGSOREJO, {tglTtd}</p>
          <p>Bendahara Pengeluaran</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.bendahara_pengeluaran?.nama || ' '}</p>
          <p>{pejabat.bendahara_pengeluaran?.npk ? `NPK.${pejabat.bendahara_pengeluaran.npk}` : ''}</p>
        </div>
      </div>

      <hr className="border-t border-black mt-4"/>

      {/* ── Persetujuan ─────────────────────────────────── */}
      <p className="mt-3">Permintaan uang kerja tersebut diatas, disetujui sejumlah :</p>
      <div className="border border-black px-3 py-1 mt-1 inline-block">
        {rpTerb}
      </div>

      {/* ── TTD bawah (Pengguna Anggaran & Bendahara Umum) ── */}
      <div className="grid grid-cols-2 mt-6">
        <div>
          <p>Mengetahui / Setuju</p>
          <p>Pengguna Anggaran</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.pengguna_anggaran?.nama || ' '}</p>
          <p>{pejabat.pengguna_anggaran?.npk ? `NPK.${pejabat.pengguna_anggaran.npk}` : ''}</p>
        </div>
        <div>
          <p>Boleh Dibayar</p>
          <p>Bendaharawan Umum</p>
          <div className="h-16"/>
          <p className="font-bold underline">{pejabat.bendahara_umum?.nama || ' '}</p>
          <p>{pejabat.bendahara_umum?.npk ? `NPK.${pejabat.bendahara_umum.npk}` : ''}</p>
        </div>
      </div>
    </div>
  )
}
