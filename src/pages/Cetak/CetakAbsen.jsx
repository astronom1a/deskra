import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import CetakLayout from './CetakLayout'
import { parsePeriode, formatTanggalLengkap } from './cetakHelpers'
import { resolvePejabatForPeriode } from '../../lib/pejabatSnapshot'

const CALIBRI = { fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }
const ABSEN_ROWS_MIN = 14
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate()
}

function monthName(month) {
  return BULAN[Math.max(0, Math.min(11, month - 1))] || ''
}

function hasPos(worker, posValue) {
  return (worker.posisi || '').split(',').map(s => s.trim()).includes(posValue)
}

function normalizeItemKey(itemKey) {
  if (['barcode_jati', 'barcode_mahoni', 'barcode_kedawung'].includes(itemKey)) return 'barcode'
  if (['tumpuk_jati', 'tumpuk_mahoni', 'tumpuk_kedawung', 'brongkol'].includes(itemKey)) return 'tumpuk'
  return itemKey
}

// Posisi khusus per item — fallback ke TENAGA_KAPLING jika belum ada pekerja dengan posisi tsb.
const ITEM_POSISI = {
  slaghammer: 'SLAGHAMMER',
  kebersihan:  'KEBERSIHAN',
  barcode:     'BARCODE',
}

function resolveWorkersForAbsen(allWorkers, itemKey) {
  const normalizedKey = normalizeItemKey(itemKey)
  const kaplingWorkers = allWorkers.filter(w => hasPos(w, 'TENAGA_KAPLING'))

  // Item dengan posisi khusus (slaghammer / kebersihan / barcode)
  if (ITEM_POSISI[normalizedKey]) {
    const specific = allWorkers.filter(w => hasPos(w, ITEM_POSISI[normalizedKey]))
    if (specific.length) return specific
    return kaplingWorkers.length ? [kaplingWorkers[0]] : []
  }

  // Item satu pekerja kapling (penomoran / sabuk / tanda_laku / listrik)
  if (['penomoran', 'sabuk', 'tanda_laku', 'listrik'].includes(normalizedKey)) {
    return kaplingWorkers.length ? [kaplingWorkers[0]] : []
  }

  // Tumpuk → semua pekerja kapling
  if (normalizedKey === 'tumpuk') return kaplingWorkers

  // Tenaga bantu
  if (normalizedKey === 'tenaga') return allWorkers.filter(w => hasPos(w, 'TENAGA_BANTU'))

  return kaplingWorkers
}

export default function CetakAbsen() {
  return (
    <CetakLayout title="Cetak Absen" landscape>
      {(periode) => <AbsenDoc periode={periode} />}
    </CetakLayout>
  )
}

function AbsenDoc({ periode }) {
  const { itemKey } = useParams()
  const [workers, setWorkers] = useState([])
  const [pejabat, setPejabat] = useState({ kepala_tpk: {}, tu_tpk: {} })

  useEffect(() => {
    (async () => {
      const [tenagaRes, pejabatRes] = await Promise.all([
        supabase.from('tabel_tenaga_kerja')
          .select('*')
          .eq('tpk_id', periode.tpk_id)
          .eq('aktif', true)
          .order('nama'),
        resolvePejabatForPeriode(periode),
      ])
      setWorkers(resolveWorkersForAbsen(tenagaRes.data || [], itemKey))
      setPejabat(pejabatRes || {})
    })()
  }, [periode, itemKey])

  const p = parsePeriode(periode.periode)
  const month = Number(p.bulan) || (new Date(periode.tgl_awal).getMonth() + 1)
  const year = Number(p.tahun) || new Date(periode.tgl_awal).getFullYear()
  const totalDays = daysInMonth(month, year)
  const dayCols = useMemo(() => Array.from({ length: totalDays }, (_, i) => i + 1), [totalDays])
  const lastDay = daysInMonth(month, year)
  const tglTtd = formatTanggalLengkap(`${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`)

  return (
    <div className="text-[10px] leading-tight text-black" style={CALIBRI}>
      <div className="text-center text-[12px] font-semibold mb-2">
        <p>( PERUSAHAAN UMUM KEHUTANAN NEGARA )</p>
        <p className="font-semibold">PERUM PERHUTANI</p>
      </div>

      <div className="mb-1">
        <p className="text-center text-[11px] font-bold">DAFTAR HADIR PEKERJA</p>
        <p>Bulan / Tahun : {monthName(month)} {year}</p>
      </div>

      <table className="w-full border-collapse border border-black text-[9.5px]">
        <thead>
          <tr className="text-center">
            <th rowSpan={2} className="border border-black px-1 py-1 w-[3%]">NO.</th>
            <th rowSpan={2} className="border border-black px-1 py-1 w-[18%]">NAMA</th>
            <th rowSpan={2} className="border border-black px-1 py-1 w-[10%]">NIK</th>
            <th colSpan={dayCols.length} className="border border-black px-1 py-1">Tanggal / Paraf Pekerja</th>
            <th rowSpan={2} className="border border-black px-1 py-1 w-[5%]">Hari Kerja</th>
          </tr>
          <tr className="text-center">
            {dayCols.map(day => (
              <th key={day} className="border border-black px-0.5 py-1 min-w-[16px]">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {workers.length === 0 ? (
            <tr>
              <td colSpan={4 + dayCols.length} className="border border-black px-2 py-3 text-center text-gray-500 italic">
                Belum ada data tenaga bantu aktif.
              </td>
            </tr>
          ) : workers.map((w, idx) => (
            <tr key={w.id}>
              <td className="border border-black text-center px-1 py-1">{idx + 1}</td>
              <td className="border border-black px-1 py-1">{w.nama || ''}</td>
              <td className="border border-black px-1 py-1">{w.nik || ''}</td>
              {dayCols.map(day => (
                <td key={day} className="border border-black h-8"></td>
              ))}
              <td className="border border-black px-1 py-1 text-center"></td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, ABSEN_ROWS_MIN - workers.length) }).map((_, i) => (
            <tr key={`filler-${i}`}>
              <td className="border border-black h-8"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              {dayCols.map(day => (
                <td key={day} className="border border-black h-8"></td>
              ))}
              <td className="border border-black"></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-3">
        <p className="text-right">WONGSOREJO, {tglTtd}</p>
      </div>

      <div className="grid grid-cols-2 mt-7">
        <div>
          <p>Mengetahui</p>
          <div className="h-16"></div>
          <p className="font-semibold">{pejabat.kepala_tpk?.nama || ''}</p>
        </div>
        <div className="text-right">
          <p>Dibuat oleh</p>
          <div className="h-16"></div>
          <p className="font-semibold">{pejabat.tu_tpk?.nama || ''}</p>
        </div>
      </div>
    </div>
  )
}
