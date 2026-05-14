import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  createPejabatSnapshot,
  getPejabatRolesFromSnapshot,
} from '../src/lib/pejabatSnapshotCore.js'

test('snapshot keeps the original officials for an existing period', () => {
  const snapshot = createPejabatSnapshot([
    { id: 1, nama: 'Pejabat Lama', npk: '001', jabatan: 'Kepala TPK', tpk_id: 'tpk-a', aktif: true },
  ], '2026-05-14T00:00:00.000Z')

  const roles = getPejabatRolesFromSnapshot(snapshot)

  assert.equal(roles.kepala_tpk.nama, 'Pejabat Lama')
  assert.equal(roles.bendahara_pengeluaran.nama, 'Pejabat Lama')
  assert.equal(snapshot.captured_at, '2026-05-14T00:00:00.000Z')
})

test('snapshot maps common jabatan aliases used by uang kerja prints', () => {
  const snapshot = createPejabatSnapshot([
    { id: 1, nama: 'Admin Utama', npk: '001', jabatan: 'Administratur Utama', tpk_id: 'tpk-a' },
    { id: 2, nama: 'Waka', npk: '002', jabatan: 'Waka Administratur', tpk_id: 'tpk-a' },
    { id: 3, nama: 'Kepala', npk: '003', jabatan: 'Kepala TPK', tpk_id: 'tpk-a' },
    { id: 4, nama: 'Pelaksana', npk: '004', jabatan: 'Pelaksana', tpk_id: 'tpk-a' },
    { id: 5, nama: 'Tata Usaha', npk: '005', jabatan: 'SP.TPK', tpk_id: 'tpk-a' },
    { id: 6, nama: 'Bendum', npk: '006', jabatan: 'Bendahara Umum', tpk_id: 'tpk-a' },
  ], '2026-05-14T00:00:00.000Z')

  const roles = getPejabatRolesFromSnapshot(snapshot)

  assert.equal(roles.pengguna_anggaran.nama, 'Admin Utama')
  assert.equal(roles.waka_administratur.nama, 'Waka')
  assert.equal(roles.wakil_adm.nama, 'Waka')
  assert.equal(roles.kepala_tpk.nama, 'Kepala')
  assert.equal(roles.bendahara_pengeluaran.nama, 'Kepala')
  assert.equal(roles.pelaksana.nama, 'Pelaksana')
  assert.equal(roles.tu_tpk.nama, 'Tata Usaha')
  assert.equal(roles.bendahara_umum.nama, 'Bendum')
})

test('snapshot stores only print-safe official fields', () => {
  const snapshot = createPejabatSnapshot([
    {
      id: 1,
      nama: 'Kepala',
      npk: '003',
      jabatan: 'Kepala TPK',
      tpk_id: 'tpk-a',
      aktif: true,
      created_at: 'should-not-be-stored',
    },
  ], '2026-05-14T00:00:00.000Z')

  const official = getPejabatRolesFromSnapshot(snapshot).kepala_tpk

  assert.deepEqual(Object.keys(official).sort(), ['id', 'jabatan', 'nama', 'npk', 'tpk_id'])
})
