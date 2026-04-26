import { supabase } from '../../lib/supabase'

// ── formatter ───────────────────────────────────────────────
export function formatRupiah(v) {
  return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(v||0))
}
export function formatAngka(v, dec=0) {
  if (v === null || v === undefined || v === '') return ''
  return new Intl.NumberFormat('id-ID',{minimumFractionDigits:dec, maximumFractionDigits:dec}).format(v)
}
export function formatAngkaFisik(v) {
  if (!v && v !== 0) return ''
  return new Intl.NumberFormat('id-ID',{maximumFractionDigits:3}).format(v)
}
const BULAN_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
export function formatTanggalLengkap(s) {
  if (!s) return ''
  const d = new Date(s); return `${d.getDate()} ${BULAN_FULL[d.getMonth()]} ${d.getFullYear()}`
}
export function formatTanggalTtd(s) {
  if (!s) return ''
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')} - ${String(d.getMonth()+1).padStart(2,'0')} - ${d.getFullYear()}`
}

// ── terbilang (angka → huruf Indonesia) ─────────────────────
const SATUAN = ['','SATU','DUA','TIGA','EMPAT','LIMA','ENAM','TUJUH','DELAPAN','SEMBILAN','SEPULUH','SEBELAS']
function terbilangRaw(n) {
  n = Math.floor(Math.abs(n))
  if (n < 12) return SATUAN[n]
  if (n < 20) return `${SATUAN[n-10]} BELAS`
  if (n < 100) return `${SATUAN[Math.floor(n/10)]} PULUH ${SATUAN[n%10]}`.trim()
  if (n < 200) return `SERATUS ${terbilangRaw(n-100)}`.trim()
  if (n < 1000) return `${SATUAN[Math.floor(n/100)]} RATUS ${terbilangRaw(n%100)}`.trim()
  if (n < 2000) return `SERIBU ${terbilangRaw(n-1000)}`.trim()
  if (n < 1_000_000) return `${terbilangRaw(Math.floor(n/1000))} RIBU ${terbilangRaw(n%1000)}`.trim()
  if (n < 1_000_000_000) return `${terbilangRaw(Math.floor(n/1_000_000))} JUTA ${terbilangRaw(n%1_000_000)}`.trim()
  if (n < 1_000_000_000_000) return `${terbilangRaw(Math.floor(n/1_000_000_000))} MILIAR ${terbilangRaw(n%1_000_000_000)}`.trim()
  return ''
}
export function terbilang(n) {
  const w = terbilangRaw(Math.round(n||0))
  return `${w} RUPIAH`.replace(/\s+/g,' ').trim()
}
export function terbilangBungkus(n) {
  return `## ${terbilang(n)} ##`
}

// ── fetch semua data yang dibutuhkan halaman cetak ──────────
export async function fetchCetakData(periodeId) {
  const [{ data: periode }, { data: rows }, { data: pejabatList }] = await Promise.all([
    supabase.from('tabel_periode').select('*').eq('id', periodeId).maybeSingle(),
    supabase.from('tabel_pekerjaan').select('*').eq('periode_id', periodeId).order('no'),
    supabase.from('tabel_pejabat').select('*').eq('aktif', true),
  ])

  const findPejabat = (predicate) => (pejabatList||[]).find(predicate) || {}
  const has = (p, needle) => (p.jabatan||'').toLowerCase().includes(needle)
  const pejabat = {
    // Pengguna Anggaran = Administratur Utama (tanpa kata "wakil")
    pengguna_anggaran:     findPejabat(p => has(p,'administratur utama') && !has(p,'wakil') && !has(p,'waka')),
    // Waka Administratur = Wakil Administratur Utama
    waka_administratur:    findPejabat(p => has(p,'wakil administratur') || has(p,'waka administratur')),
    bendahara_umum:        findPejabat(p => has(p,'bendahara umum')),
    // Bendahara Pengeluaran = Kepala TPK (sesuai praktik di lapangan)
    bendahara_pengeluaran: findPejabat(p => has(p,'kepala tpk') || has(p,'bendahara pengeluaran')),
  }

  const grandTotal = (rows||[]).reduce((s,r) => s + (Number(r.fisik)||0) * (Number(r.tarif)||0), 0)

  return { periode, rows: rows || [], pejabat, grandTotal }
}

// Pecah string periode "II/3/2026" atau "II / 3 / 2026" menjadi { half, bulan, tahun }
export function parsePeriode(p) {
  if (!p) return { half:'', bulan:'', tahun:'' }
  const m = p.replace(/\s+/g,'').split('/')
  return { half: m[0]||'', bulan: m[1]||'', tahun: m[2]||'' }
}
