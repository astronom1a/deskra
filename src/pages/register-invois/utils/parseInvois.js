// Parser nomor invois. Format (setelah prefix huruf opsional mis. ECK/ECR/EKK):
//   [akun 3-5 digit][YYMMDD][jam 4-5 digit]
// Umumnya akun 4 digit + jam 4 digit (HHMM), tapi ada case akun 5 digit dan
// jam 5 digit. Karena panjang total bisa ambigu, pembagian dipilih lewat
// validasi tanggal (tahun 20xx wajar, bulan 01-12, tgl 01-31) dan jam
// (HH < 24, MM < 60).

const AKUN_LENGTHS = [4, 5, 3]

function buildCandidate(prefix, digits, akunLen) {
  const jamLen = digits.length - akunLen - 6
  if (jamLen < 4 || jamLen > 5) return null

  const akun    = digits.slice(0, akunLen)
  const tglRaw  = digits.slice(akunLen, akunLen + 6)
  const jamRaw  = digits.slice(akunLen + 6)

  const yy = Number(tglRaw.slice(0, 2))
  const mm = Number(tglRaw.slice(2, 4))
  const dd = Number(tglRaw.slice(4, 6))
  const hh = Number(jamRaw.slice(0, 2))
  const mi = Number(jamRaw.slice(2, 4))

  if (yy < 20 || yy > 39) return null
  if (mm < 1 || mm > 12) return null
  if (dd < 1 || dd > 31) return null
  if (hh > 23 || mi > 59) return null

  return {
    prefix,
    akun,
    tglRaw,
    jamRaw,
    tanggal: `20${tglRaw.slice(0, 2)}-${tglRaw.slice(2, 4)}-${tglRaw.slice(4, 6)}`,
    jam: `${jamRaw.slice(0, 2)}:${jamRaw.slice(2, 4)}`,
  }
}

export function parseInvois(raw) {
  const value = String(raw ?? '').trim().toUpperCase()
  const match = value.match(/^([A-Z]+)?(\d{13,16})$/)
  if (!match) return null

  const prefix = match[1] || ''
  const digits = match[2]

  const candidates = AKUN_LENGTHS
    .map(len => buildCandidate(prefix, digits, len))
    .filter(Boolean)

  if (!candidates.length) return null
  return {
    ...candidates[0],
    ambiguous: candidates.length > 1,
    alternatives: candidates.slice(1),
  }
}

export function formatTanggalInvois(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}
