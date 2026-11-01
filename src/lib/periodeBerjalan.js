// Logika murni window periode (paruh bulan) — sumber tunggal dipakai oleh
// MainLink (generate tanggal) & Dashboard (panel periode berjalan + reminder).
// Tanpa dependensi Supabase/React agar bisa dites dengan node --test.

function isLeapYear(tahun) {
  return (tahun % 4 === 0 && tahun % 100 !== 0) || tahun % 400 === 0
}

function lastDay(bulan, tahun) {
  if (bulan === 2) return isLeapYear(tahun) ? 29 : 28
  return [4, 6, 9, 11].includes(bulan) ? 30 : 31
}

function pad2(n) { return String(n).padStart(2, '0') }

function toIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// Rentang tanggal untuk satu paruh — sumber tunggal dipakai getPeriodeWindow
// (window hari ini) maupun MainLink (paruh+bulan+tahun pilihan user).
export function getRentangTanggal(half, bulan, tahun) {
  const m = pad2(bulan)
  return half === 'I'
    ? { tglAwal: `${tahun}-${m}-01`, tglAkhir: `${tahun}-${m}-15` }
    : { tglAwal: `${tahun}-${m}-16`, tglAkhir: `${tahun}-${m}-${pad2(lastDay(bulan, tahun))}` }
}

// window berjalan yang memuat `date` — murni diturunkan dari tanggal, bukan dari DB
export function getPeriodeWindow(date) {
  const tahun = date.getFullYear()
  const bulan = date.getMonth() + 1
  const half  = date.getDate() <= 15 ? 'I' : 'II'
  const { tglAwal, tglAkhir } = getRentangTanggal(half, bulan, tahun)
  return { half, bulan, tahun, label: `${half}/${bulan} / ${tahun}`, tglAwal, tglAkhir }
}

export function getPeriodeSebelumnya(window) {
  if (window.half === 'II') {
    return getPeriodeWindow(new Date(window.tahun, window.bulan - 1, 1))
  }
  const bulanSebelumnya = window.bulan === 1 ? 12 : window.bulan - 1
  const tahunSebelumnya = window.bulan === 1 ? window.tahun - 1 : window.tahun
  return getPeriodeWindow(new Date(tahunSebelumnya, bulanSebelumnya - 1, 16))
}

// Selisih hari dari `today` ke `tglAkhir` (ISO date) — dibanding sebagai string
// tanggal lokal, bukan objek Date, supaya tidak bergeser akibat UTC.
export function hariTersisa(tglAkhir, today = new Date()) {
  const todayIso = toIsoDate(today)
  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((new Date(`${tglAkhir}T00:00:00`) - new Date(`${todayIso}T00:00:00`)) / msPerDay)
}

// Model dua sumbu: `current` (periode berjalan) & `previous` (periode sebelumnya).
// `previousApplicable=false` dipakai saat periode sebelumnya mendahului mulainya
// pemakaian aplikasi oleh TPK ini, jadi tidak relevan untuk ditandai overdue.
export function getStatusPeriode({
  window, periodeRow, totalUk,
  periodeRowSebelumnya, totalUkSebelumnya, previousApplicable = true,
  empty = false, today = new Date(),
}) {
  if (empty) {
    return { empty: true, current: null, previous: 'none', hariTersisa: null, reminderAktif: false }
  }

  const sisaHari = hariTersisa(window.tglAkhir, today)
  const current  = !periodeRow ? 'missing' : !(totalUk > 0) ? 'noData' : 'onTrack'

  const previous = !previousApplicable
    ? 'none'
    : (!periodeRowSebelumnya || !(totalUkSebelumnya > 0)) ? 'overdue' : 'archived'

  const reminderAktif =
    (['missing', 'noData'].includes(current) && sisaHari >= 0 && sisaHari <= 3)
    || previous === 'overdue'

  return { empty: false, current, previous, hariTersisa: sisaHari, reminderAktif }
}
