import { useEffect, useState, Fragment as Frag } from 'react'
import { supabase } from '../../lib/supabase'
import CetakLayout, { CetakPageSkeleton } from './CetakLayout'
import { buildRows } from '../../lib/rekapPekerjaan'
import { formatAngka, formatAngkaFisik, terbilangBungkus, formatTanggalTtd, parsePeriode } from './cetakHelpers'

const TIMES = { fontFamily: '"Times New Roman", Times, serif' }
const SORTIMEN = ['AIII', 'AII', 'AI']

export default function CetakBiayaTPK() {
  return (
    <CetakLayout title="Cetak Biaya TPK">
      {(periode) => <BiayaTPKDoc periode={periode} />}
    </CetakLayout>
  )
}

function BiayaTPKDoc({ periode }) {
  const [data, setData] = useState(null)

  useEffect(() => {
    (async () => {
      const [rows, tumpukRes, brongkolRes, pejabatRes] = await Promise.all([
        buildRows(periode.id, periode.periode),
        supabase.from('tabel_tumpuk_kapling').select('*').eq('periode_id', periode.id),
        supabase.from('tabel_tumpuk_brongkol').select('*').eq('periode_id', periode.id),
        supabase.from('tabel_pejabat').select('*').eq('aktif', true),
      ])
      const has = (p, n) => (p.jabatan || '').toLowerCase().includes(n)
      const find = (pred) => (pejabatRes.data || []).find(pred) || {}
      const pejabat = {
        pengguna_anggaran:     find(p => has(p, 'administratur utama') && !has(p, 'wakil') && !has(p, 'waka')),
        bendahara_umum:        find(p => has(p, 'bendahara umum')),
        bendahara_pengeluaran: find(p => has(p, 'kepala tpk') || has(p, 'bendahara pengeluaran')),
      }
      setData({ rows, tumpuk: tumpukRes.data || [], brongkol: brongkolRes.data || [], pejabat })
    })()
  }, [periode.id])

  if (!data) return <CetakPageSkeleton />

  const { rows, tumpuk, brongkol, pejabat } = data
  const perd = parsePeriode(periode.periode)
  const tglTtd = formatTanggalTtd(periode.tgl_akhir)

  const findRow = (key) => rows.find(r => r._key === key) || {}
  const r = {
    penomoran:  findRow('penomoran'),
    sabuk:      findRow('sabuk'),
    tanda_laku: findRow('tanda_laku'),
    slaghammer: findRow('slaghammer'),
    jati:       findRow('tumpuk_jati'),
    barcode_jati: findRow('barcode_jati'),
    barcode_mahoni: findRow('barcode_mahoni'),
    barcode_kedawung: findRow('barcode_kedawung'),
    tenaga:     findRow('tenaga'),
    kebersihan: findRow('kebersihan'),
    listrik:    findRow('listrik'),
  }
  const customs = rows.filter(x => x._key?.startsWith('custom_'))

  const barcodeRows = [r.barcode_jati, r.barcode_mahoni, r.barcode_kedawung]
    .filter(x => x && Object.keys(x).length)
  const barcodeTotalFisik = barcodeRows.reduce((s, x) => s + (x.fisik || 0), 0)
  const barcodeTotalNilai = barcodeRows.reduce((s, x) => s + ((x.fisik || 0) * (x.tarif || 0)), 0)
  const barcodeNo = barcodeRows
    .map(x => x.no)
    .filter(n => typeof n === 'number')
    .sort((a, b) => a - b)[0]
  const barcodeGabung = {
    ...r.barcode_jati,
    no: barcodeNo,
    kode_rek: barcodeRows[0]?.kode_rek || '51.69.44',
    uraian: 'PEMASANGAN BARCODE',
    satuan: 'BTG',
    fisik: barcodeTotalFisik,
    tarif: barcodeTotalFisik > 0 ? barcodeTotalNilai / barcodeTotalFisik : (barcodeRows[0]?.tarif || 0),
  }

  // Sortimen breakdown
  const sortimenOf = (jenisFilter) => SORTIMEN.map(s => {
    const matches = tumpuk.filter(x => jenisFilter(x.jenis) && x.sortimen === s)
    const volume = matches.reduce((sum, m) => sum + (m.volume || 0), 0)
    const tarif = matches[0]?.tarif || 0
    return { sortimen: s, volume, tarif, nilai: Math.round(volume * tarif) }
  })
  const sortimenJati  = sortimenOf(j => j === 'JATI')
  const sortimenRimba = sortimenOf(j => j === 'RIMBA_MAHONI' || j === 'RIMBA_KEDAWUNG')
  const totalJati  = sortimenJati.reduce((s, x) => s + x.nilai, 0)
  const totalRimba = sortimenRimba.reduce((s, x) => s + x.nilai, 0)
  const totalJatiVol  = sortimenJati.reduce((s, x) => s + x.volume, 0)
  const totalRimbaVol = sortimenRimba.reduce((s, x) => s + x.volume, 0)

  const brongkolFisik = brongkol.reduce((s, b) => s + (b.volume || 0), 0)
  const brongkolTarif = brongkol[0]?.tarif || 7000
  const brongkolNilai = Math.round(brongkolFisik * brongkolTarif)

  const grand = Math.round(rows.reduce((s, x) => s + (x.fisik || 0) * (x.tarif || 0), 0))

  // Reusable: pasangan baris Kwit + Pmby untuk item sederhana
  const SimpleItem = ({ row, label, hidePmby = false }) => {
    const nilai = Math.round((row.fisik || 0) * (row.tarif || 0))
    if (!nilai) return null
    const txt = formatAngka(nilai)
    return (
      <Frag>
        <tr>
          <td className="border border-black px-1 text-center">Kwit</td>
          <td className="border border-black px-1 text-center">{typeof row.no === 'number' ? row.no : '-'}</td>
          <td className="border border-black px-2 font-semibold">BY {label || row.uraian || ''}</td>
          <td className="border border-black px-1 text-center">{row.kode_rek || '51.69.91'}</td>
          <td className="border border-black px-1 text-right">{txt}</td>
          <td className="border border-black px-1"></td>
          <td className="border border-black px-1 text-right">{txt}</td>
          <td className="border border-black px-1"></td>
          <td className="border border-black px-1 text-right">{txt}</td>
        </tr>
        <tr>
          <td className="border border-black px-1 text-center">Pmby</td>
          <td className="border border-black"></td>
          <td className="border border-black px-2 italic">
            {!hidePmby && row.fisik > 0
              ? `${formatAngkaFisik(row.fisik)} ${row.satuan || ''}  ${formatAngka(row.tarif)}`
              : ''}
          </td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
        </tr>
      </Frag>
    )
  }

  // Blok tumpuk dengan rincian sortimen + JMLH
  const TumpukBlock = ({ title, no, sortimens, totalVol, totalNilai }) => (
    <Frag>
      <tr>
        <td className="border border-black px-1 text-center">Kwit</td>
        <td className="border border-black px-1 text-center">{typeof no === 'number' ? no : '-'}</td>
        <td className="border border-black px-2 font-semibold" colSpan={7}>BY {title}</td>
      </tr>
      {sortimens.map((s, i) => (
        <tr key={s.sortimen}>
          <td className="border border-black px-1 text-center">{i === 0 ? 'Pmby' : ''}</td>
          <td className="border border-black"></td>
          <td className="border border-black px-2">
            <span className="inline-block w-10">{s.sortimen}</span>
            <span className="inline-block w-20 text-right pr-2">{formatAngkaFisik(s.volume)} M3</span>
            <span className="inline-block w-16 text-right">{formatAngka(s.tarif)}</span>
          </td>
          <td className="border border-black px-1 text-center">51.69.44</td>
          <td className="border border-black px-1 text-right">{s.nilai ? formatAngka(s.nilai) : '-'}</td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
          <td className="border border-black"></td>
        </tr>
      ))}
      <tr className="font-semibold">
        <td className="border border-black"></td>
        <td className="border border-black"></td>
        <td className="border border-black px-2">
          <span className="inline-block w-10">JMLH</span>
          <span className="inline-block w-20 text-right pr-2">{formatAngkaFisik(totalVol)}</span>
        </td>
        <td className="border border-black"></td>
        <td className="border border-black px-1 text-right">{totalNilai ? formatAngka(totalNilai) : '-'}</td>
        <td className="border border-black"></td>
        <td className="border border-black px-1 text-right">{totalNilai ? formatAngka(totalNilai) : '-'}</td>
        <td className="border border-black"></td>
        <td className="border border-black px-1 text-right">{totalNilai ? formatAngka(totalNilai) : '-'}</td>
      </tr>
    </Frag>
  )

  return (
    <div className="text-[10px] leading-tight text-black" style={TIMES}>
      {/* ── Header ─────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-2 items-center mb-2">
        <div className="col-span-2">
          <img
            src="/logo-perhutani.png"
            alt="Perhutani"
            className="h-14 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
          />
        </div>
        <div className="col-span-6 text-center">
          <p className="font-bold text-[12px]">PERUSAHAAN UMUM KEHUTANAN NEGARA</p>
          <p className="font-bold text-[12px]">(PERUM PERHUTANI)</p>
        </div>
        <div className="col-span-4">
          <div className="bg-gray-200 border border-black text-center font-bold text-[12px] py-1">
            GABUNGAN PEMBAYARAN
          </div>
          <table className="w-full border border-black border-t-0 text-[10px]">
            <tbody>
              <tr>
                <td className="border-b border-r border-black px-1">Masa Pembayaran</td>
                <td className="border-b border-r border-black px-1 text-center">{perd.half} / {perd.bulan}</td>
                <td className="border-b border-black px-1 text-center">{perd.tahun}</td>
              </tr>
              <tr>
                <td className="border-b border-r border-black px-1" colSpan={2}>Nomer Bukti KK/BK</td>
                <td className="border-b border-black px-1">: …………….</td>
              </tr>
              <tr>
                <td className="border-r border-black px-1" colSpan={2}>Rekening Lawan</td>
                <td className="px-1">: …………….</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Kode Rekening boxes ───────────────────────── */}
      <div className="mb-2">
        <p className="text-[10px] mb-1">Kode Rekening dan Rupiah</p>
        <table className="text-[10px]">
          <tbody>
            {[0, 1, 2, 3].map(i => (
              <tr key={i}>
                <td className={`border border-black w-7 h-6 text-center font-bold ${i ? 'border-t-0' : ''}`}>{i === 0 ? '5' : ''}</td>
                <td className={`border border-black w-7 h-6 text-center font-bold ${i ? 'border-t-0' : ''} border-l-0`}>{i === 0 ? '1' : ''}</td>
                <td className={`border border-black w-7 h-6 text-center font-bold ${i ? 'border-t-0' : ''} border-l-0`}>{i === 0 ? '6' : ''}</td>
                <td className={`border border-black w-7 h-6 text-center font-bold ${i ? 'border-t-0' : ''} border-l-0`}>{i === 0 ? '9' : ''}</td>
                <td className="px-2 whitespace-nowrap">Rp. ……………………………</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Banyaknya Uang ─────────────────────────────── */}
      <div className="flex items-center gap-2 mb-2">
        <span className="whitespace-nowrap">Banyaknya Uang :</span>
        <div className="flex-1 border border-black px-3 py-1 font-bold text-center">
          {terbilangBungkus(grand)}
        </div>
      </div>

      {/* ── Tabel utama ───────────────────────────────── */}
      <table className="w-full border-collapse border border-black text-[10px]">
        <thead>
          <tr className="text-center align-middle bg-gray-50">
            <th className="border border-black p-1 w-[7%]">Macam Surat<br/>Bukti</th>
            <th className="border border-black p-1 w-[5%]">No. Urut<br/>Bukti</th>
            <th className="border border-black p-1">Uraian Pembayaran</th>
            <th className="border border-black p-1 w-[8%]">Kode<br/>Rekening</th>
            <th className="border border-black p-1 w-[10%]">Pembayaran<br/>Pokok (Rp)</th>
            <th className="border border-black p-1 w-[7%]">PPN<br/>(Rp)</th>
            <th className="border border-black p-1 w-[10%]">Pembayaran<br/>Kotor (Rp)</th>
            <th className="border border-black p-1 w-[7%]">PPh<br/>(Rp)</th>
            <th className="border border-black p-1 w-[10%]">Pembayaran<br/>Bersih (Rp)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={9} className="border border-black px-2 py-1 font-bold">BIAYA &nbsp;&nbsp;TPK</td>
          </tr>

          <SimpleItem row={r.penomoran} label="PENOMORAN KAPLING" />
          <SimpleItem row={r.sabuk}     label="SABUK KAPLING" />
          <SimpleItem row={r.tanda_laku} label="TANDA LAKU" />
          <SimpleItem row={r.slaghammer} label="SLAGHAMMER" />

          {totalJati > 0 && (
            <TumpukBlock title="TUMPUK KAPLING JATI"
              no={r.jati.no} sortimens={sortimenJati}
              totalVol={totalJatiVol} totalNilai={totalJati}/>
          )}
          {totalRimba > 0 && (
            <TumpukBlock title="TUMPUK KAPLING RIMBA"
              no={'-'} sortimens={sortimenRimba}
              totalVol={totalRimbaVol} totalNilai={totalRimba}/>
          )}

          {brongkolNilai > 0 && (
            <Frag>
              <tr>
                <td className="border border-black px-1 text-center">Kwit</td>
                <td className="border border-black px-1 text-center">-</td>
                <td className="border border-black px-2 font-semibold" colSpan={7}>BY TUMPUK BRONGKOL/KA</td>
              </tr>
              <tr>
                <td className="border border-black px-1 text-center">Pmby</td>
                <td className="border border-black"></td>
                <td className="border border-black px-2">
                  <span className="inline-block w-20 text-right pr-2">{formatAngkaFisik(brongkolFisik)} SM</span>
                  <span className="inline-block w-16 text-right">{formatAngka(brongkolTarif)}</span>
                </td>
                <td className="border border-black px-1 text-center">51.69.44</td>
                <td className="border border-black px-1 text-right">{formatAngka(brongkolNilai)}</td>
                <td className="border border-black"></td>
                <td className="border border-black px-1 text-right">{formatAngka(brongkolNilai)}</td>
                <td className="border border-black"></td>
                <td className="border border-black px-1 text-right">{formatAngka(brongkolNilai)}</td>
              </tr>
            </Frag>
          )}

          <SimpleItem row={barcodeGabung} label="PEMASANGAN BARCODE" />
          <SimpleItem row={r.tenaga}     label={r.tenaga.uraian || 'TENAGA BANTU'} hidePmby />
          <SimpleItem row={r.kebersihan} label="KEBERSIHAN" hidePmby />
          <SimpleItem row={r.listrik}    label="LISTRIK TPK" hidePmby />

          {customs.map(c => (
            <SimpleItem key={c._key} row={c} label={c.uraian} />
          ))}

          {/* Total */}
          <tr className="font-bold">
            <td colSpan={4} className="border border-black px-2 py-1 text-right">Jumlah Rp.</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
            <td className="border border-black px-1 text-right">-</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
            <td className="border border-black px-1 text-right">-</td>
            <td className="border border-black px-1 text-right">{formatAngka(grand)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── Footer signatures ─────────────────────────── */}
      <table className="w-full border-collapse border border-black text-[10px] mt-0 border-t-0">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 w-[14%] align-top">Keterangan</td>
            <td className="border border-black px-2 py-1 text-center">Mengetahui / Setuju Dibayar</td>
            <td className="border border-black px-2 py-1 text-center">Boleh Dibayar</td>
            <td className="border border-black px-2 py-1 text-center">Yang Menerima / Melaksanakan</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1">Tempat &amp; Tanggal</td>
            <td className="border border-black px-2 py-1 text-center">BANYUWANGI, {tglTtd}</td>
            <td className="border border-black px-2 py-1 text-center">BANYUWANGI, {tglTtd}</td>
            <td className="border border-black px-2 py-1 text-center">BANYUWANGI, {tglTtd}</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1">Jabatan</td>
            <td className="border border-black px-2 py-1 text-center">Pengguna Anggaran</td>
            <td className="border border-black px-2 py-1 text-center">Bendahara Umum</td>
            <td className="border border-black px-2 py-1 text-center">Bendahara Pengeluaran</td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1">Tanda Tangan</td>
            <td className="border border-black px-2 py-1 h-16"></td>
            <td className="border border-black px-2 py-1 h-16"></td>
            <td className="border border-black px-2 py-1 h-16"></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1">Nama Terang</td>
            <td className="border border-black px-2 py-1 text-center font-bold">{pejabat.pengguna_anggaran?.nama || ''}</td>
            <td className="border border-black px-2 py-1 text-center font-bold">{pejabat.bendahara_umum?.nama || ''}</td>
            <td className="border border-black px-2 py-1 text-center font-bold">{pejabat.bendahara_pengeluaran?.nama || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
