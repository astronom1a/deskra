import assert from 'node:assert/strict'
import test from 'node:test'
import { parseInvois, formatTanggalInvois } from '../src/pages/register-invois/utils/parseInvois.js'

test('parse standar: akun 4 digit + YYMMDD + jam 4 digit', () => {
  const p = parseInvois('44312607121436')
  assert.equal(p.akun, '4431')
  assert.equal(p.tanggal, '2026-07-12')
  assert.equal(p.jam, '14:36')
  assert.equal(p.prefix, '')
})

test('parse akun 5 digit', () => {
  const p = parseInvois('159792607121500')
  assert.equal(p.akun, '15979')
  assert.equal(p.tanggal, '2026-07-12')
  assert.equal(p.jam, '15:00')
})

test('parse akun 3 digit', () => {
  const p = parseInvois('6292607101645')
  assert.equal(p.akun, '629')
  assert.equal(p.tanggal, '2026-07-10')
  assert.equal(p.jam, '16:45')
})

test('parse akun 5 digit + jam 5 digit (16 digit total)', () => {
  const p = parseInvois('1720126071309365')
  assert.equal(p.akun, '17201')
  assert.equal(p.tanggal, '2026-07-13')
  assert.equal(p.jam, '09:36')
  assert.equal(p.jamRaw, '09365')
})

test('parse dengan prefix huruf', () => {
  const p = parseInvois('ECK11082604251134')
  assert.equal(p.prefix, 'ECK')
  assert.equal(p.akun, '1108')
  assert.equal(p.tanggal, '2026-04-25')
  assert.equal(p.jam, '11:34')
})

test('input lowercase dan spasi tetap terparse', () => {
  const p = parseInvois('  eck11082604251134 ')
  assert.equal(p.prefix, 'ECK')
  assert.equal(p.akun, '1108')
})

test('nomor non-pattern menghasilkan null', () => {
  assert.equal(parseInvois('2/KSP/VI/2026'), null)
  assert.equal(parseInvois(''), null)
  assert.equal(parseInvois(null), null)
  assert.equal(parseInvois('123'), null)
  // 14 digit tapi tanggal tidak valid di semua pembagian
  assert.equal(parseInvois('99999999999999'), null)
})

test('validasi tanggal memilih pembagian akun yang benar', () => {
  // akun 4 digit menghasilkan bulan 60 (invalid) → jatuh ke akun 5 digit
  const p = parseInvois('172012607130936')
  assert.equal(p.akun, '17201')
  assert.equal(p.tanggal, '2026-07-13')
  assert.equal(p.ambiguous, false)
})

test('formatTanggalInvois menampilkan dd/mm/yyyy', () => {
  assert.equal(formatTanggalInvois('2026-07-12'), '12/07/2026')
  assert.equal(formatTanggalInvois(null), '')
})
