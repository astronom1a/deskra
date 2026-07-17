import assert from 'node:assert/strict'
import test from 'node:test'
import { cleanPembeliName } from '../src/pages/register-invois/utils/cleanPembeliName.js'

test('memotong blob invois PDF nyata menjadi nama saja', () => {
  const blob = 'AGUSTI GUNAWAN Email : cu2nk86@gmail.com Type Pembeli : PERSONAL No KTP : 3510182808970001 NPWP : Alamat : DUSUN GALEKAN RT/RW 01/01 Detail Transaksi : No Kapling Jenis Kayu Sort 2621302000991 JATI AII 18 1.1700'
  assert.equal(cleanPembeliName(blob), 'AGUSTI GUNAWAN')
})

test('penanda pertama menang meski urutan berbeda', () => {
  assert.equal(cleanPembeliName('CV KAYU HUTAN LESTARI Type Pembeli : PERUSAHAAN No KTP : 123'), 'CV KAYU HUTAN LESTARI')
  assert.equal(cleanPembeliName('BUDI SANTOSO Alamat : JL. MAWAR NO 1'), 'BUDI SANTOSO')
  assert.equal(cleanPembeliName('ANDI NPWP : 73.431.827.2-627.000'), 'ANDI')
})

test('penanda case-insensitive dan tahan teks multi-baris', () => {
  assert.equal(cleanPembeliName('SITI AMINAH email : a@b.com\nAlamat : Banyuwangi'), 'SITI AMINAH')
})

test('nama yang sudah bersih tidak berubah', () => {
  assert.equal(cleanPembeliName('CV KAYU HUTAN LESTARI'), 'CV KAYU HUTAN LESTARI')
  assert.equal(cleanPembeliName('  BUDI  '), 'BUDI')
})

test('input kosong menghasilkan string kosong', () => {
  assert.equal(cleanPembeliName(''), '')
  assert.equal(cleanPembeliName(null), '')
  assert.equal(cleanPembeliName(undefined), '')
})
